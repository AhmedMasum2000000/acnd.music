declare module '@barba/core' {
  export default class Barba {
    static init(options?: any): void;
    static on(event: string, callback: (data?: any) => any): void;
    static off(event: string, callback?: (data?: any) => any): void;
    static go(url: string, options?: any): void;
  }
}
