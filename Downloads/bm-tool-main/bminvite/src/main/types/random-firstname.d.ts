declare module 'random-firstname' {
  export interface RandomFirstNameOptions {
    gender?: 'male' | 'female';
    country?: string;
  }

  export default function randomFirstName(options?: RandomFirstNameOptions): string;
}


