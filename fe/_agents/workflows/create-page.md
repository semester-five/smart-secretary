---
description: Standard workflow for creating a new page and route in the Next.js App Router for Smart Secretary.
---

# Creating a New Route/Page Workflow

1. **Determine the Route Group**:
   - The app uses route groups like `(main)` for authenticated/main layouts and `(external)` for unauthenticated/public layouts. Choose the correct group in `src/app/`.

2. **Create the Route Directory**:
   - Create a directory for the new path (`src/app/(main)/my-new-path`).

3. **Create the Page File**:
   - Inside the new directory, create `page.tsx`.
   - Next.js requires pages to be default exports.

4. **Template (Server Component by Default)**:
   ```tsx
   import React from "react";

   export default function MyNewPage() {
     return (
       <div className="flex flex-col gap-4 p-6">
         <h1 className="text-2xl font-bold">My New Page</h1>
         {/* Render Server Components or Client Components here */}
       </div>
     );
   }
   ```

5. **Fetching Data**:
   - If data fetching is needed without interactivity, fetch it directly in the Server Component.
   - If data fetching needs client-side caching or mutations, use TanStack React Query (`useQuery`, `useMutation`) in a separate Client Component, then import it into the page.

6. **Add Metadata (Optional)**:
   - For SEO and tab titles, export metadata from the `page.tsx`.
   ```tsx
   import type { Metadata } from "next";

   export const metadata: Metadata = {
     title: "My New Page | Smart Secretary",
     description: "Description of my new page.",
   };
   ```

7. **Lint and Format**:
   - Ensure the new files comply with Biome formatting.
