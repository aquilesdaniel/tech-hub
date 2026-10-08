"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { CHROME, SERIES } from "./viz";

export function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="monotone"
          dataKey="v"
          stroke={CHROME.deEmphasis}
          strokeWidth={2}
          fill={CHROME.deEmphasis}
          fillOpacity={0.1}
          isAnimationActive={false}
          dot={(props: any) =>
            props.index === data.length - 1 ? (
              <circle
                key="current"
                cx={props.cx}
                cy={props.cy}
                r={3}
                fill={SERIES.s1}
                stroke={CHROME.surface}
                strokeWidth={2}
              />
            ) : (
              <g key={props.index} />
            )
          }
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
