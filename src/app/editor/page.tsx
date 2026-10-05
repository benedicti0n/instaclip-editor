import type { Metadata } from "next";
import { EditorShell } from "@/components/editor/editor-shell";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Editor — ${APP_NAME}`,
};

export default function EditorPage() {
  return <EditorShell />;
}
