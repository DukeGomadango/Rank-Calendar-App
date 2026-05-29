import * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dango-header": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "active-tool"?: string;
          "portal-url"?: string;
        },
        HTMLElement
      >;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "dango-header": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "active-tool"?: string;
          "portal-url"?: string;
        },
        HTMLElement
      >;
    }
  }
}
