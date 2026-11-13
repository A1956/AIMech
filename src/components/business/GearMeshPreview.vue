<script setup>
import { computed } from 'vue'

const props = defineProps({
  spinning: { type: Boolean, default: false },
  title: { type: String, default: '请确定参数' },
  hint: { type: String, default: '调整左侧约束后点击生成' },
})

const buildGearPath = (teeth, outerR, rootR, holeR) => {
  const step = (Math.PI * 2) / teeth
  const pts = []
  for (let i = 0; i < teeth; i += 1) {
    const base = i * step - Math.PI / 2
    const aTip0 = base + step * 0.12
    const aTip1 = base + step * 0.38
    const aRoot0 = base + step * 0.5
    const aRoot1 = base + step * 0.88
    const push = (angle, r) => {
      pts.push([Math.cos(angle) * r, Math.sin(angle) * r])
    }
    push(base, rootR)
    push(aTip0, outerR)
    push(aTip1, outerR)
    push(aRoot0, rootR)
    push(aRoot1, rootR)
  }
  const ring = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')
  const hole = [
    `M${holeR.toFixed(2)} 0`,
    `A${holeR} ${holeR} 0 1 0 ${(-holeR).toFixed(2)} 0`,
    `A${holeR} ${holeR} 0 1 0 ${holeR.toFixed(2)} 0`,
  ].join(' ')
  return `${ring} Z ${hole} Z`
}

const large = { teeth: 16, outerR: 24, rootR: 18.5, holeR: 5.2, cx: 34, cy: 48 }
const small = { teeth: 10, outerR: 14, rootR: 10.6, holeR: 3.4, cy: 48 }
const gap = 1.6
const smallShiftLeft = 2
const smallCx = large.cx + large.outerR + small.outerR + gap - smallShiftLeft
const smallInitRotate = 10

const largePath = computed(() => buildGearPath(large.teeth, large.outerR, large.rootR, large.holeR))
const smallPath = computed(() => buildGearPath(small.teeth, small.outerR, small.rootR, small.holeR))
const smallPeriodSec = computed(() => (2 * small.teeth) / large.teeth)

const statusLabel = computed(() => (props.spinning ? '正在推演匹配方案' : props.title))
</script>

<template>
  <div class="gear-mesh overflow-hidden rounded-xl border border-[color:var(--bio-line)] bg-ink/40">
    <div class="flex items-center justify-between gap-2 border-b border-[color:var(--bio-line)] px-3 py-2">
      <p class="truncate text-sm font-medium text-paper">{{ statusLabel }}</p>
      <span class="shrink-0 text-xs text-mist">{{ spinning ? '计算中' : '待生成' }}</span>
    </div>
    <div class="relative aspect-[16/10] w-full p-2">
      <svg viewBox="0 0 100 100" class="h-full w-full" role="img" :aria-label="statusLabel">
        <defs>
          <radialGradient id="gearGlow" cx="50%" cy="48%" r="42%">
            <stop offset="0%" stop-color="rgba(14,124,134,0.22)" />
            <stop offset="100%" stop-color="rgba(14,124,134,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="48" rx="42" ry="30" fill="url(#gearGlow)" />

        <g :transform="`translate(${large.cx} ${large.cy})`">
          <g :class="{ 'gear-spin-cw': spinning }">
            <path
              :d="largePath"
              fill-rule="evenodd"
              fill="rgba(14,124,134,0.22)"
              stroke="#0e7c86"
              stroke-width="1.1"
            />
            <circle cx="0" cy="0" :r="large.holeR * 0.42" fill="#1fa97a" />
            <line
              x1="0"
              :y1="-large.holeR * 1.35"
              x2="0"
              :y2="-large.holeR * 0.55"
              stroke="#5ec8d0"
              stroke-width="1.1"
              stroke-linecap="round"
            />
          </g>
        </g>

        <g :transform="`translate(${smallCx} ${small.cy}) rotate(${smallInitRotate})`">
          <g
            class="gear-spin-small"
            :class="{ 'is-spinning': spinning }"
            :style="{ '--gear-period': `${smallPeriodSec}s` }"
          >
            <path
              :d="smallPath"
              fill-rule="evenodd"
              fill="rgba(31,169,122,0.18)"
              stroke="#1fa97a"
              stroke-width="1.1"
            />
            <circle cx="0" cy="0" :r="small.holeR * 0.45" fill="#0e7c86" />
            <line
              x1="0"
              :y1="small.holeR * 0.55"
              x2="0"
              :y2="small.holeR * 1.35"
              stroke="#5ec8d0"
              stroke-width="1"
              stroke-linecap="round"
            />
          </g>
        </g>

        <text x="50" y="90" text-anchor="middle" font-size="4" fill="currentColor" opacity="0.55">
          {{ spinning ? '双齿轮合推演中…' : '约束就绪后生成方案' }}
        </text>
      </svg>

      <div class="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 px-4 text-center">
        <p class="text-sm font-medium text-paper/90">{{ spinning ? '正在推演匹配方案' : title }}</p>
        <p class="text-xs text-mist">{{ spinning ? '请稍候，即将展示原理图与推荐列表' : hint }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gear-spin-cw,
.gear-spin-small {
  transform-box: fill-box;
  transform-origin: center;
}

.gear-spin-cw {
  animation: gear-rotate-cw 2s linear infinite;
}

.gear-spin-small.is-spinning {
  animation: gear-rotate-ccw var(--gear-period, 1.25s) linear infinite;
}

@keyframes gear-rotate-cw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes gear-rotate-ccw {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gear-spin-cw,
  .gear-spin-small.is-spinning {
    animation: none;
  }
}
</style>
