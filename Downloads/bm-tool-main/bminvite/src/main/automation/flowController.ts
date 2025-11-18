import { getPrismaClient } from '../db/prismaClient';
import { LocalQueue } from '../jobs/localQueue';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

interface AutomationOptions {
  inviteIds?: number[];
  bmId?: number;
  viaIds?: number[];
}

export class AutomationController extends EventEmitter {
  private static instance: AutomationController;
  private prisma = getPrismaClient();
  private queue: LocalQueue;
  private isRunning: boolean = false;

  private constructor() {
    super();
    // Use local in-memory queue (no Redis required)
    this.queue = new LocalQueue();
  }

  static getInstance(): AutomationController {
    if (!AutomationController.instance) {
      AutomationController.instance = new AutomationController();
    }
    return AutomationController.instance;
  }

  async startAutomation(options: AutomationOptions): Promise<void> {
    if (this.isRunning) {
      throw new Error('Automation is already running');
    }

    this.isRunning = true;
    logger.info('Starting automation...', options);

    try {
      const { inviteIds, bmId, viaIds } = options;

      // Get BM profile
      let bmProfile;
      if (bmId) {
        bmProfile = await this.prisma.profile.findUnique({
          where: { id: bmId, type: 'BM' },
        });
      } else {
        // Get first pinned BM profile
        bmProfile = await this.prisma.profile.findFirst({
          where: { type: 'BM', pinned: true },
        });
      }

      if (!bmProfile) {
        throw new Error('No BM profile available');
      }

      // Get VIA profiles
      let viaProfiles;
      if (viaIds && viaIds.length > 0) {
        viaProfiles = await this.prisma.profile.findMany({
          where: { id: { in: viaIds }, type: 'VIA' },
        });
      } else {
        viaProfiles = await this.prisma.profile.findMany({
          where: { type: 'VIA', status: 'idle' },
        });
      }

      if (viaProfiles.length === 0) {
        throw new Error('No VIA profiles available');
      }

      // Get invites
      let invites;
      if (inviteIds && inviteIds.length > 0) {
        invites = await this.prisma.invite.findMany({
          where: { id: { in: inviteIds }, status: 'pending' },
        });
      } else {
        invites = await this.prisma.invite.findMany({
          where: { status: 'pending' },
        });
      }

      if (invites.length === 0) {
        throw new Error('No pending invites available');
      }

      // Assign invites to VIA profiles
      const invitesPerVia = Math.ceil(invites.length / viaProfiles.length);
      let inviteIndex = 0;

      for (const viaProfile of viaProfiles) {
        const assignedInvites = invites.slice(inviteIndex, inviteIndex + invitesPerVia);
        inviteIndex += invitesPerVia;

        for (const invite of assignedInvites) {
          // Update invite with profiles
          await this.prisma.invite.update({
            where: { id: invite.id },
            data: {
              viaId: viaProfile.id,
              bmId: bmProfile.id,
            },
          });

          // Add to queue
          await this.queue.addInviteJob(invite.id, viaProfile.id, bmProfile.id);
        }
      }

      logger.info(`Started automation for ${invites.length} invites`);
      this.emit('automation:started', { inviteCount: invites.length });
    } catch (error: any) {
      this.isRunning = false;
      logger.error('Failed to start automation:', error);
      throw error;
    }
  }

  async stopAutomation(): Promise<void> {
    this.isRunning = false;
    logger.info('Stopping automation...');
    this.emit('automation:stopped');
  }

  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}

