// Ensures TypeScript correctly handles lucide-react icons in JSX 
declare module 'lucide-react' {
  import { ComponentType, SVGAttributes } from 'react';
  export const Search: ComponentType<SVGAttributes<SVGElement>>;
  export const X: ComponentType<SVGAttributes<SVGElement>>;
  export const ChevronLeft: ComponentType<SVGAttributes<SVGElement>>;
  export const ChevronRight: ComponentType<SVGAttributes<SVGElement>>;
  export const MoreHorizontal: ComponentType<SVGAttributes<SVGElement>>;
}