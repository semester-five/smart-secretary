---
description: Standard workflow for creating a new reusable component in the Smart Secretary project.
---

# Creating a New Component Workflow

1. **Verify if a Component Exists**:
   - Check `src/components/ui` or `src/components` to avoid duplication.
   - If reusing a Shadcn UI component, make sure it is installed (using shadcn CLI tools or checking `components.json`).
   
2. **Component File Creation**:
   - Create the file in `src/components` (or a relevant subdirectory) using kebab-case: `src/components/my-component.tsx`.
   - Use `"use client"` only if the component requires state, effects, or user interactions.
   
3. **Template**:
   ```tsx
   import React from "react";
   import { cn } from "@/lib/utils";

   interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
     // Custom props here
   }

   export const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
     ({ className, ...props }, ref) => {
       return (
         <div ref={ref} className={cn("base-classes", className)} {...props}>
           {/* Component Content */}
         </div>
       );
     }
   );
   MyComponent.displayName = "MyComponent";
   ```

4. **Styling**:
   - Use Tailwind utility classes directly in the `className` attribute.
   - Use `cn` from `@/lib/utils` to merge `className` props effectively.

5. **Lint and Format**:
   - After writing, ensure Biome rules are met (`npm run format`).
