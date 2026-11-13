<script setup>
import { ref } from 'vue'

const stages = [
  {
    title: '机理认知',
    method: '案例导入 · 探究式教学',
    goal: '从生物现象中提炼可验证的力学机理。',
    activity: '观察壁虎干黏附、荷叶润湿等现象，提出假设并用参数解释。',
    output: '机理图与关键参数清单',
    color: '#0E7C86',
  },
  {
    title: '结构映射',
    method: '类比迁移 · 对比教学',
    goal: '把生物机理映射为可制造的机械结构。',
    activity: '对照蜂巢夹层与鸟骨中空梁，分析载荷路径与失效边界。',
    output: '结构草图与方案对照表',
    color: '#188F76',
  },
  {
    title: '方案设计',
    method: '项目驱动 · 小组协作',
    goal: '围绕工程约束形成多个可解释的候选方案。',
    activity: '给定载荷、介质、行程和重量上限，完成参数选型与估算。',
    output: '参数化设计方案',
    color: '#C07C22',
  },
  {
    title: '验证迭代',
    method: '实验验证 · 形成性评价',
    goal: '用计算或实验检验方案，并根据证据迭代。',
    activity: '检查强度、稳定性与功能指标，复盘偏差并给出改进。',
    output: '验证记录与迭代报告',
    color: '#C45C26',
  },
]

const isSpread = ref(false)
const openStage = ref(-1)
const toggleSpread = () => {
  isSpread.value = !isSpread.value
  if (!isSpread.value) openStage.value = -1
}
const toggleStage = (index) => {
  if (!isSpread.value) isSpread.value = true
  openStage.value = openStage.value === index ? -1 : index
}
</script>

<template>
  <section class="teacher-path space-y-5">
    <div class="bio-card flex flex-wrap items-center justify-between gap-3 p-5">
      <div>
        <p class="text-xs font-semibold tracking-[0.18em] text-teal">TEACHING DESIGN</p>
        <h2 class="mt-2 text-xl font-semibold">智能教学路径</h2>
        <p class="mt-1 text-sm text-mist">以工程能力递进为主线，串联教学方法、课堂活动与阶段成果。</p>
      </div>
      <div class="rounded-xl border border-teal/20 bg-teal/10 px-4 py-3 text-sm text-teal">
        由机理理解逐级走向工程验证
      </div>
    </div>

    <div class="teacher-path-deck" :class="{ 'is-spread': isSpread }">
      <div class="teacher-path-deck__controls">
        <span>{{ isSpread ? 'Z 字递进路径' : '4 阶段路径卡' }}</span>
        <el-button size="small" type="primary" plain @click="toggleSpread">
          {{ isSpread ? '收拢卡牌' : '展开路径' }}
        </el-button>
      </div>
      <div class="teacher-path-steps">
      <article
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="teacher-path-stage bio-card"
        :class="{ 'is-open': openStage === index }"
        :style="{
          '--stage-color': stage.color,
          '--stage-index': index,
          '--stack-x': `${index % 2 ? '-58%' : '58%'}`,
          '--stack-y': `${index < 2 ? '58%' : '-58%'}`,
          '--stack-angle': `${(index - (stages.length - 1) / 2) * 2}deg`,
          '--spread-angle': `${index % 2 ? '1.2deg' : '-1.2deg'}`,
        }"
        :inert="!isSpread && index > 0"
      >
        <span class="teacher-path-stage__topline" aria-hidden="true" />
        <button
          :id="`teacher-stage-trigger-${index}`"
          type="button"
          class="teacher-path-stage__trigger"
          :aria-expanded="openStage === index"
          :aria-controls="`teacher-stage-panel-${index}`"
          @click="toggleStage(index)"
        >
          <span class="teacher-path-stage__number">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="teacher-path-stage__heading">
            <span class="teacher-path-stage__eyebrow">阶段 {{ index + 1 }} · STEP {{ index + 1 }}</span>
            <span class="teacher-path-stage__title">{{ stage.title }}</span>
            <span class="teacher-path-stage__method">{{ stage.method }}</span>
          </span>
          <span class="teacher-path-stage__chevron" aria-hidden="true">⌄</span>
        </button>

        <div
          :id="`teacher-stage-panel-${index}`"
          class="teacher-path-stage__collapse"
          :class="{ 'is-expanded': openStage === index }"
          role="region"
          :aria-labelledby="`teacher-stage-trigger-${index}`"
          :inert="openStage !== index"
        >
          <div class="teacher-path-stage__details">
            <p class="teacher-path-stage__goal">{{ stage.goal }}</p>
            <div class="teacher-path-stage__activity">
              <span class="teacher-path-stage__label">课堂活动</span>
              <p>{{ stage.activity }}</p>
            </div>
            <div class="teacher-path-stage__output">
              <span>阶段成果</span>
              <strong>{{ stage.output }}</strong>
            </div>
          </div>
        </div>
      </article>
      </div>
    </div>
    <p class="text-center text-xs text-mist">点击「展开路径」或任一阶段卡牌，按 Z 字顺序浏览教学设计</p>
  </section>
</template>

<style scoped>
.teacher-path-deck {
  overflow: hidden;
  border: 1px solid var(--bio-line);
  border-radius: 1rem;
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--bio-teal) 10%, transparent), transparent 70%),
    color-mix(in srgb, var(--bio-panel) 84%, var(--bio-ink));
  padding: 1rem;
}

.teacher-path-deck__controls {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--bio-mist);
  font-size: 0.8rem;
}

.teacher-path-steps {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 13.5rem;
  gap: 1rem;
  padding: 1rem 0 0;
  perspective: 1400px;
}

.teacher-path-stage {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--stage-color) 30%, var(--bio-line));
  grid-area: 1 / 1;
  width: min(88%, 38rem);
  justify-self: center;
  transform:
    translate(calc(var(--stage-index) * 0.12rem), calc(var(--stage-index) * -0.1rem))
    rotate(var(--stack-angle));
  transform-origin: 50% 50%;
  z-index: calc(10 - var(--stage-index));
  transition:
    transform 0.72s cubic-bezier(0.2, 0.8, 0.2, 1),
    border-color 0.2s ease,
    box-shadow 0.25s ease;
}

.teacher-path-deck.is-spread .teacher-path-steps {
  min-height: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 1.5rem 0 0.5rem;
  column-gap: 1rem;
  row-gap: 1.25rem;
}

.teacher-path-deck.is-spread .teacher-path-stage {
  grid-area: auto;
  width: 100%;
  transform: rotate(var(--spread-angle));
  animation: teacher-card-deal 0.65s both;
  animation-delay: calc(var(--stage-index) * 100ms);
}

.teacher-path-deck.is-spread .teacher-path-stage:nth-child(2),
.teacher-path-deck.is-spread .teacher-path-stage:nth-child(3) {
  margin-top: 1.5rem;
}

.teacher-path-deck.is-spread .teacher-path-stage.is-open {
  z-index: 10;
  border-color: color-mix(in srgb, var(--stage-color) 62%, var(--bio-line));
  box-shadow: var(--bio-shadow), 0 0 0 1px color-mix(in srgb, var(--stage-color) 16%, transparent);
  transform: rotate(0deg) translateY(-0.45rem) scale(1.025);
}

@media (hover: hover) {
  .teacher-path-deck.is-spread .teacher-path-stage:not(.is-open):hover {
    z-index: 9;
    transform: rotate(0deg) translateY(-0.35rem) scale(1.015);
  }
}

.teacher-path-stage__topline {
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, var(--stage-color), transparent 85%);
}

.teacher-path-stage__trigger {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.85rem;
  padding: 1.15rem 1rem 0.85rem;
  text-align: left;
}

.teacher-path-stage__trigger:focus-visible {
  border-radius: 0.75rem;
  outline: 2px solid var(--stage-color);
  outline-offset: -3px;
}

.teacher-path-stage__number {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--stage-color) 34%, transparent);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--stage-color) 13%, var(--bio-panel));
  color: var(--stage-color);
  font-size: 1rem;
  font-weight: 750;
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.is-open .teacher-path-stage__number {
  transform: scale(1.06);
  background: var(--stage-color);
  color: white;
}

.teacher-path-stage__heading {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.12rem;
}

.teacher-path-stage__eyebrow,
.teacher-path-stage__label {
  color: var(--bio-mist);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.teacher-path-stage__title {
  color: var(--bio-paper);
  font-size: 1rem;
  font-weight: 700;
}

.teacher-path-stage__method {
  overflow: hidden;
  color: var(--stage-color);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacher-path-stage__chevron {
  flex: 0 0 auto;
  color: var(--stage-color);
  font-size: 1.25rem;
  line-height: 1;
  transition: transform 0.25s ease;
}

.is-open .teacher-path-stage__chevron {
  transform: rotate(180deg);
}

.teacher-path-stage__collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 0.35s ease, opacity 0.25s ease;
}

.teacher-path-stage__collapse.is-expanded {
  grid-template-rows: 1fr;
  opacity: 1;
}

.teacher-path-stage__details {
  min-height: 0;
  overflow: hidden;
  padding: 0 1rem;
}

.teacher-path-stage__goal {
  border-top: 1px solid var(--bio-line);
  padding-top: 0.85rem;
  color: var(--bio-paper);
  font-size: 0.875rem;
  line-height: 1.65;
}

.teacher-path-stage__activity {
  margin-top: 0.8rem;
  border-radius: 0.7rem;
  background: color-mix(in srgb, var(--stage-color) 7%, var(--bio-panel));
  padding: 0.7rem 0.8rem;
  color: var(--bio-paper);
  font-size: 0.82rem;
  line-height: 1.65;
}

.teacher-path-stage__activity p {
  margin-top: 0.2rem;
}

.teacher-path-stage__output {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  padding: 0.8rem 0 1rem;
  color: var(--bio-mist);
  font-size: 0.75rem;
}

.teacher-path-stage__output strong {
  border-radius: 999px;
  background: color-mix(in srgb, var(--stage-color) 12%, var(--bio-panel));
  padding: 0.28rem 0.65rem;
  color: var(--stage-color);
  font-weight: 600;
}

@keyframes teacher-card-deal {
  from {
    opacity: 0.75;
    transform: translate(var(--stack-x), var(--stack-y)) rotate(var(--stack-angle)) scale(0.96);
  }
  to {
    opacity: 1;
    transform: rotate(var(--spread-angle)) scale(1);
  }
}

@media (min-width: 640px) and (max-width: 1279px) {
  .teacher-path-deck { padding: 1.25rem; }
}

@media (min-width: 1280px) {
  .teacher-path-deck { padding: 1.5rem 2rem; }
}

@media (prefers-reduced-motion: reduce) {
  .teacher-path-stage {
    transition: none;
    animation-duration: 0.01ms !important;
  }

  .teacher-path-stage__number,
  .teacher-path-stage__chevron,
  .teacher-path-stage__collapse {
    transition: none;
  }
}
</style>
