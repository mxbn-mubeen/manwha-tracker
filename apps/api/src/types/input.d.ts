declare module "input" {
  interface InputOptions {
    prompt?: string;
    default?: string;
    echo?: boolean;
  }

  function text(prompt?: string, options?: InputOptions): Promise<string>;
  function password(prompt?: string, options?: InputOptions): Promise<string>;
  function confirm(prompt?: string, options?: InputOptions): Promise<boolean>;

  export default {
    text,
    password,
    confirm,
  };
}
