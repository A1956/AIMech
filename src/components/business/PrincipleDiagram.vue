<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 方案 caseId：1 壁虎 … 8 蛇形 */
  caseId: { type: Number, required: true },
  title: { type: String, default: '' },
  focus: { type: String, default: '' },
  /** 标注数据：载荷 / 行程 / 比载荷等 */
  annotations: {
    type: Object,
    default: () => ({}),
  },
})

const kind = computed(() => {
  const map = {
    1: 'gecko',
    2: 'honeycomb',
    3: 'shark',
    4: 'bone',
    5: 'bat',
    6: 'lotus',
    7: 'beak',
    8: 'snake',
  }
  return map[props.caseId] || 'gecko'
})

const labels = computed(() => {
  const a = props.annotations || {}
  return [
    { key: 'load', text: a.load != null ? `载荷 ${a.load} N` : null, x: 12, y: 18 },
    { key: 'stroke', text: a.stroke != null ? `行程 ${a.stroke} mm` : null, x: 68, y: 18 },
    { key: 'specific', text: a.specificLoad != null ? `比载荷 ${Number(a.specificLoad).toFixed(1)} N/kg` : null, x: 12, y: 92 },
    { key: 'focus', text: props.focus ? `焦点：${props.focus}` : null, x: 50, y: 92 },
  ].filter((item) => item.text)
})
</script>

<template>
  <div class="principle-diagram overflow-hidden rounded-xl border border-[color:var(--bio-line)] bg-ink/40">
    <div class="flex items-center justify-between gap-2 border-b border-[color:var(--bio-line)] px-3 py-2">
      <p class="truncate text-sm font-medium text-paper">{{ title || '原理示意图' }}</p>
      <span class="shrink-0 text-xs text-mist">可切换方案同步切换</span>
    </div>
    <div class="relative aspect-[16/10] w-full p-2">
      <svg viewBox="0 0 100 100" class="h-full w-full" role="img" :aria-label="title">
        <!-- 壁虎足 -->
        <g v-if="kind === 'gecko'">
          <ellipse cx="50" cy="58" rx="28" ry="18" fill="rgba(31,169,122,0.18)" stroke="#1FA97A" stroke-width="1.2" />
          <path d="M28 52 Q36 40 44 48" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <path d="M40 48 Q50 36 58 48" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <path d="M54 48 Q64 38 72 52" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <circle cx="36" cy="46" r="2.2" fill="#C45C26" />
          <circle cx="50" cy="42" r="2.2" fill="#C45C26" />
          <circle cx="64" cy="46" r="2.2" fill="#C45C26" />
          <text x="50" y="78" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">刚毛分区 / 剥离角</text>
        </g>
        <!-- 蜂巢 -->
        <g v-else-if="kind === 'honeycomb'">
          <path
            d="M30 35 L42 28 L54 35 L54 49 L42 56 L30 49 Z M46 35 L58 28 L70 35 L70 49 L58 56 L46 49 Z M38 52 L50 45 L62 52 L62 66 L50 73 L38 66 Z"
            fill="rgba(94,200,208,0.12)"
            stroke="#5EC8D0"
            stroke-width="1.1"
          />
          <rect x="22" y="24" width="56" height="8" rx="1" fill="rgba(196,92,38,0.35)" stroke="#C45C26" stroke-width="0.8" />
          <rect x="22" y="72" width="56" height="8" rx="1" fill="rgba(196,92,38,0.35)" stroke="#C45C26" stroke-width="0.8" />
          <text x="50" y="88" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">面板 + 芯层</text>
        </g>
        <!-- 鲨鱼沟槽 -->
        <g v-else-if="kind === 'shark'">
          <path d="M12 40 Q50 28 88 40" fill="none" stroke="#1FA97A" stroke-width="1.2" />
          <path d="M12 55 Q50 43 88 55" fill="none" stroke="#1FA97A" stroke-width="1.2" />
          <path d="M12 70 Q50 58 88 70" fill="none" stroke="#1FA97A" stroke-width="1.2" />
          <path d="M20 38 L24 48 L20 58 L24 68" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <path d="M40 34 L44 44 L40 54 L44 64" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <path d="M60 34 L64 44 L60 54 L64 64" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <path d="M80 38 L84 48 L80 58 L84 68" fill="none" stroke="#5EC8D0" stroke-width="1.4" />
          <text x="50" y="86" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">顺流肋 · s+</text>
        </g>
        <!-- 鸟骨梁 -->
        <g v-else-if="kind === 'bone'">
          <ellipse cx="50" cy="50" rx="36" ry="16" fill="none" stroke="#1FA97A" stroke-width="2" />
          <ellipse cx="50" cy="50" rx="22" ry="8" fill="rgba(14,124,134,0.12)" stroke="#5EC8D0" stroke-width="1" />
          <line x1="28" y1="50" x2="72" y2="50" stroke="#C45C26" stroke-width="1.2" />
          <line x1="50" y1="42" x2="50" y2="58" stroke="#C45C26" stroke-width="1.2" />
          <text x="50" y="78" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">中空 + 加肋</text>
        </g>
        <!-- 蝙蝠声呐 -->
        <g v-else-if="kind === 'bat'">
          <circle cx="28" cy="50" r="8" fill="rgba(94,200,208,0.25)" stroke="#5EC8D0" stroke-width="1.2" />
          <path d="M36 50 Q55 30 78 42" fill="none" stroke="#1FA97A" stroke-width="1.2" stroke-dasharray="2 1.5" />
          <path d="M36 50 Q55 70 78 58" fill="none" stroke="#1FA97A" stroke-width="1.2" stroke-dasharray="2 1.5" />
          <circle cx="78" cy="42" r="3" fill="#C45C26" />
          <circle cx="78" cy="58" r="3" fill="#C45C26" />
          <text x="50" y="86" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">发射 / 双耳接收</text>
        </g>
        <!-- 荷叶 -->
        <g v-else-if="kind === 'lotus'">
          <ellipse cx="50" cy="52" rx="30" ry="22" fill="rgba(31,169,122,0.15)" stroke="#1FA97A" stroke-width="1.3" />
          <circle cx="38" cy="46" r="3.5" fill="rgba(94,200,208,0.5)" stroke="#5EC8D0" />
          <circle cx="55" cy="42" r="4" fill="rgba(94,200,208,0.45)" stroke="#5EC8D0" />
          <circle cx="48" cy="58" r="3" fill="rgba(94,200,208,0.4)" stroke="#5EC8D0" />
          <circle cx="62" cy="56" r="2.5" fill="rgba(94,200,208,0.4)" stroke="#5EC8D0" />
          <text x="50" y="86" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">微柱 · 滚动角</text>
        </g>
        <!-- 翠鸟喙 -->
        <g v-else-if="kind === 'beak'">
          <path d="M18 55 L72 40 L88 48 L72 56 Z" fill="rgba(196,92,38,0.2)" stroke="#C45C26" stroke-width="1.2" />
          <path d="M18 55 Q40 48 72 48" fill="none" stroke="#5EC8D0" stroke-width="1" />
          <text x="50" y="78" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">长细比 / 曲率连续</text>
        </g>
        <!-- 蛇形 -->
        <g v-else>
          <path
            d="M12 60 C 24 40, 36 40, 48 55 S 72 75, 88 45"
            fill="none"
            stroke="#1FA97A"
            stroke-width="2.2"
            stroke-linecap="round"
          />
          <circle cx="20" cy="52" r="2.4" fill="#5EC8D0" />
          <circle cx="36" cy="46" r="2.4" fill="#5EC8D0" />
          <circle cx="52" cy="56" r="2.4" fill="#5EC8D0" />
          <circle cx="68" cy="62" r="2.4" fill="#5EC8D0" />
          <circle cx="84" cy="48" r="2.4" fill="#C45C26" />
          <text x="50" y="86" text-anchor="middle" font-size="4.2" fill="currentColor" opacity="0.65">曲率波 · 关节链</text>
        </g>

        <!-- 数据标注 -->
        <g v-for="item in labels" :key="item.key">
          <rect
            :x="item.x - 14"
            :y="item.y - 5"
            width="28"
            height="8"
            rx="1.5"
            fill="rgba(15,23,32,0.72)"
            stroke="rgba(94,200,208,0.45)"
            stroke-width="0.4"
          />
          <text
            :x="item.x"
            :y="item.y"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="3.2"
            fill="#E8EEF4"
          >
            {{ item.text.length > 18 ? item.text.slice(0, 17) + '…' : item.text }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
