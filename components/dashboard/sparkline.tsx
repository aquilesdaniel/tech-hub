"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { CHROME, SERIE } from "./viz";

export function Sparkline({ valores }: { valores: number[] }) {
  const dados = valores.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={dados} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="monotone"
          dataKey="v"
          stroke={CHROME.atenuado}
          strokeWidth={2}
          fill={CHROME.atenuado}
          fillOpacity={0.1}
          isAnimationActive={false}
          dot={(props: any) =>
            props.index === dados.length - 1 ? (
              <circle
                key="atual"
                cx={props.cx}
                cy={props.cy}
                r={3}
                fill={SERIE.s1}
                stroke={CHROME.superficie}
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
