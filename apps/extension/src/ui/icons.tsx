/**
 * The six icons the interface actually uses, drawn as inline SVG.
 *
 * The site uses Phosphor; the extension has six actions, and pulling a whole
 * icon package for six glyphs costs more bundle than the whole popup. These are
 * the Phosphor shapes for the same actions, in `currentColor`, so the tokens
 * decide the colour.
 */

type IconProps = { size?: number; className?: string };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 256 256',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 16,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
  focusable: 'false' as const,
});

export function ListIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M40 64h176M40 128h176M40 192h176" />
    </svg>
  );
}

export function SlidersIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M48 64h60M140 64h68M48 128h32M112 128h96M48 192h84M164 192h44" />
      <circle cx="124" cy="64" r="16" />
      <circle cx="96" cy="128" r="16" />
      <circle cx="148" cy="192" r="16" />
    </svg>
  );
}

export function InfoIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="128" cy="128" r="96" />
      <path d="M128 120v56M128 84h.01" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M128 48v160M48 128h160" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M40 72h176M88 72V56a8 8 0 0 1 8-8h64a8 8 0 0 1 8 8v16M168 208H88a8 8 0 0 1-8-8V72h96v128a8 8 0 0 1-8 8Z" />
    </svg>
  );
}

export function ArrowIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M48 128h152M144 72l56 56-56 56" />
    </svg>
  );
}
