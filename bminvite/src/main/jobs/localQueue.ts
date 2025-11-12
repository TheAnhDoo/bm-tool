import { EventEmitter } from 'events';
import { getPrismaClient } from '../db/prismaClient';
import { logger } from '../utils/logger';
import { ViaRunner } from '../automation/viaRunner';
import { BMRunner } from '../automation/bmRunner';

interface ProfileJobData {
  profileId: number;
}

interface InviteJobData {
  inviteId: number;
  viaProfileId: number;
  bmProfileId: number;
}

interface QueueJob<T> {
  id: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export class LocalQueue extends EventEmitter {
  private profileQueue: QueueJob<ProfileJobData>[] = [];
  private inviteQueue: QueueJob<InviteJobData>[] = [];
  private profileWorkers: Map<string, Promise<void>> = new Map();
  private inviteWorkers: Map<string, Promise<void>> = new Map();
  private profileRunners: Map<number, ViaRunner | BMRunner> = new Map(); // Track active runners by profileId
  private isProcessing = false;
  private profileConcurrency = 2;
  private inviteConcurrency = 1;
  private prisma = getPrismaClient();

  constructor() {
    super();
    this.startProcessing();
  }

  private async startProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Process profile queue
    setInterval(() => this.processProfileQueue(), 1000);
    // Process invite queue
    setInterval(() => this.processInviteQueue(), 1000);
  }

  private async processProfileQueue() {
    const activeWorkers = this.profileWorkers.size;
    if (activeWorkers >= this.profileConcurrency) return;

    const availableSlots = this.profileConcurrency - activeWorkers;
    const pendingJobs = this.profileQueue.filter(
      (job) => job.status === 'pending'
    );

    for (let i = 0; i < Math.min(availableSlots, pendingJobs.length); i++) {
      const job = pendingJobs[i];
      if (!this.profileWorkers.has(job.id)) {
        this.processProfileJob(job);
      }
    }
  }

  private async processInviteQueue() {
    const activeWorkers = this.inviteWorkers.size;
    if (activeWorkers >= this.inviteConcurrency) return;

    const pendingJobs = this.inviteQueue.filter(
      (job) => job.status === 'pending'
    );

    if (pendingJobs.length > 0 && activeWorkers === 0) {
      const job = pendingJobs[0];
      if (!this.inviteWorkers.has(job.id)) {
        this.processInviteJob(job);
      }
    }
  }

  private async processProfileJob(job: QueueJob<ProfileJobData>) {
    job.status = 'processing';
    const workerPromise = this.executeProfileJob(job);
    this.profileWorkers.set(job.id, workerPromise);

    workerPromise
      .then(() => {
        job.status = 'completed';
        this.profileQueue = this.profileQueue.filter((j) => j.id !== job.id);
        this.profileWorkers.delete(job.id);
        this.emit('profile:completed', job);
      })
      .catch((error) => {
        job.attempts++;
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          this.profileQueue = this.profileQueue.filter((j) => j.id !== job.id);
          this.profileWorkers.delete(job.id);
          this.emit('profile:failed', job, error);
          logger.error(`Profile job ${job.id} failed after ${job.attempts} attempts:`, error);
        } else {
          job.status = 'pending';
          this.profileWorkers.delete(job.id);
          logger.warn(`Profile job ${job.id} retrying (attempt ${job.attempts}/${job.maxAttempts})`);
        }
      });
  }

  private async executeProfileJob(job: QueueJob<ProfileJobData>) {
    const { profileId } = job.data;
    logger.info(`Processing profile job: ${profileId}`);

    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Process based on profile type
    let runner: ViaRunner | BMRunner;
    if (profile.type === 'VIA') {
      runner = new ViaRunner(profile);
    } else if (profile.type === 'BM') {
      runner = new BMRunner(profile);
    } else {
      throw new Error(`Unknown profile type: ${profile.type}`);
    }

    // Store runner so we can close browser later
    this.profileRunners.set(profileId, runner);
    
    try {
      await runner.run();
    } catch (error) {
      // Remove runner on error (will be cleaned up)
      this.profileRunners.delete(profileId);
      throw error;
    }
  }

  private async processInviteJob(job: QueueJob<InviteJobData>) {
    job.status = 'processing';
    const workerPromise = this.executeInviteJob(job);
    this.inviteWorkers.set(job.id, workerPromise);

    workerPromise
      .then(() => {
        job.status = 'completed';
        this.inviteQueue = this.inviteQueue.filter((j) => j.id !== job.id);
        this.inviteWorkers.delete(job.id);
        this.emit('invite:completed', job);
      })
      .catch((error) => {
        job.attempts++;
        if (job.attempts >= job.maxAttempts) {
          job.status = 'failed';
          this.inviteQueue = this.inviteQueue.filter((j) => j.id !== job.id);
          this.inviteWorkers.delete(job.id);
          this.emit('invite:failed', job, error);
          logger.error(`Invite job ${job.id} failed after ${job.attempts} attempts:`, error);
        } else {
          job.status = 'pending';
          this.inviteWorkers.delete(job.id);
          logger.warn(`Invite job ${job.id} retrying (attempt ${job.attempts}/${job.maxAttempts})`);
        }
      });
  }

  private async executeInviteJob(job: QueueJob<InviteJobData>) {
    const { inviteId, viaProfileId, bmProfileId } = job.data;
    logger.info(`Processing invite job: ${inviteId}`);

    const invite = await this.prisma.invite.findUnique({
      where: { id: inviteId },
      include: { viaProfile: true, bmProfile: true },
    });

    if (!invite || !invite.viaProfile || !invite.bmProfile) {
      throw new Error(`Invite ${inviteId} or profiles not found`);
    }

    // Update invite status
    await this.prisma.invite.update({
      where: { id: inviteId },
      data: { status: 'processing' },
    });

    try {
      // Step 1: VIA profile opens invite and extracts data
      const viaRunner = new ViaRunner(invite.viaProfile);
      const inviteData = await viaRunner.extractInviteData(invite.link);

      if (!inviteData.viaUid || !inviteData.adAccountUid) {
        throw new Error('Failed to extract invite data');
      }

      // Store extracted data in database for transfer
      await this.prisma.invite.update({
        where: { id: inviteId },
        data: {
          adAccountId: inviteData.adAccountUid,
          result: JSON.stringify({
            viaUid: inviteData.viaUid,
            adAccountUid: inviteData.adAccountUid,
          }),
        },
      });

      logger.info(`Invite ${inviteId}: Extracted viaUid=${inviteData.viaUid}, adAccountUid=${inviteData.adAccountUid}`);

      // Step 2: BM profile sets role (receives viaUid and adAccountUid)
      const bmRunner = new BMRunner(invite.bmProfile);
      await bmRunner.setRoleForAdAccount(inviteData.adAccountUid, inviteData.viaUid);

      logger.info(`Invite ${inviteId}: Role set for ad account ${inviteData.adAccountUid}`);

      // Step 3: VIA profile accepts invite
      await viaRunner.acceptInvite(invite.link);

      logger.info(`Invite ${inviteId}: Invite accepted by VIA profile`);

      // Update invite as success
      await this.prisma.invite.update({
        where: { id: inviteId },
        data: {
          status: 'success',
          result: JSON.stringify({
            viaUid: inviteData.viaUid,
            adAccountUid: inviteData.adAccountUid,
          }),
          completedAt: new Date(),
        },
      });

      logger.info(`Invite ${inviteId} completed successfully`);
    } catch (error: any) {
      logger.error(`Invite ${inviteId} failed:`, error);

      await this.prisma.invite.update({
        where: { id: inviteId },
        data: {
          status: 'failed',
          result: JSON.stringify({ error: error.message }),
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async addProfileJob(profileId: number): Promise<void> {
    const jobId = `profile-${profileId}-${Date.now()}`;
    const job: QueueJob<ProfileJobData> = {
      id: jobId,
      data: { profileId },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };
    this.profileQueue.push(job);
    logger.info(`Added profile job: ${jobId}`);
  }

  async removeProfileJob(profileId: number): Promise<void> {
    // Remove jobs for this profile
    this.profileQueue = this.profileQueue.filter(
      (job) => job.data.profileId !== profileId
    );
    
    // Close browser if runner is active
    const runner = this.profileRunners.get(profileId);
    if (runner) {
      try {
        await runner.cleanup();
        logger.info(`Closed browser for profile ${profileId}`);
      } catch (error: any) {
        logger.error(`Failed to close browser for profile ${profileId}:`, error);
      }
      this.profileRunners.delete(profileId);
    }
    
    logger.info(`Removed profile jobs for profile ${profileId}`);
  }

  async addInviteJob(inviteId: number, viaProfileId: number, bmProfileId: number): Promise<void> {
    const jobId = `invite-${inviteId}-${Date.now()}`;
    const job: QueueJob<InviteJobData> = {
      id: jobId,
      data: { inviteId, viaProfileId, bmProfileId },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };
    this.inviteQueue.push(job);
    logger.info(`Added invite job: ${jobId}`);
  }

  async close(): Promise<void> {
    this.isProcessing = false;
    // Wait for all workers to complete
    await Promise.all([
      ...Array.from(this.profileWorkers.values()),
      ...Array.from(this.inviteWorkers.values()),
    ]);
    logger.info('Queue closed');
  }
}


