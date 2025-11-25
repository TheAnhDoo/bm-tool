declare module 'random-lastname' {
  export interface RandomLastNameOptions {
    country?: string;
  }

  export default function randomLastName(options?: RandomLastNameOptions): string;
}


