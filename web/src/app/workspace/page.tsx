"use client";

import { motion } from "framer-motion";
import { Layers, Type } from "lucide-react";
import { useState } from "react";
import { Segmented } from "@/components/ui/Controls";
import { StatusIndicator } from "@/components/ui/Display";
import { BatchWorkspace } from "@/components/workspace/Batch";
import { SingleWorkspace } from "@/components/workspace/Single";

type Mode = "single" | "batch";

export default function WorkspacePage() {
  const [mode, setMode] = useState<Mode>("single");
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-28 sm:px-6 sm:pt-32">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3">
            <StatusIndicator />
          </div>
          <h1 className="text-gradient text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Sentiment workspace</h1>
          <p className="mt-2 font-mono text-xs tracking-wide text-faint">Analyze → Predict → Understand</p>
        </div>
        <Segmented
          layoutId="workspace-mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "single", label: <><Type className="size-3.5" />Single text</> },
            { value: "batch", label: <><Layers className="size-3.5" />Batch</> },
          ]}
        />
      </div>
      {/* Both modes stay mounted so switching back keeps results and inputs. */}
      {(["single", "batch"] as const).map((m) => (
        <motion.div
          key={m}
          hidden={mode !== m}
          initial={false}
          animate={mode === m ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {m === "single" ? <SingleWorkspace /> : <BatchWorkspace />}
        </motion.div>
      ))}
    </div>
  );
}
