import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Smart Secretary",
  version: packageJson.version,
  copyright: `© ${currentYear}, Smart Secretary.`,
  meta: {
    title: "Smart Secretary - Admin Dashboard",
    description:
      "Smart Secretary is an intelligent assistant platform built with Next.js 16, Tailwind CSS v4, and shadcn/ui.",
  },
};
