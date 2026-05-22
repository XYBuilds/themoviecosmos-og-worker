/** Minimal JSX-like tree for satori (no React dependency). */
export type OgElement = {
  type: string;
  props: {
    style?: Record<string, string | number>;
    src?: string;
    children?: OgElement | string | Array<OgElement | string>;
    [key: string]: unknown;
  };
};

export function el(
  type: string,
  props: OgElement["props"],
  ...children: Array<OgElement | string>
): OgElement {
  const merged = { ...props };
  if (children.length > 0) {
    merged.children =
      children.length === 1 ? children[0] : (children as Array<OgElement | string>);
  }
  return { type, props: merged };
}
