import { ENVIRONMENTS, PRECISIONS } from '@/types'

const envLabel = (value) => ENVIRONMENTS.find((item) => item.value === value)?.label || value
const precisionLabel = (value) => PRECISIONS.find((item) => item.value === value)?.label || value

const scheme = (caseId, title, focus, score, reasons, caution) => ({
  caseId,
  title,
  focus,
  score,
  reasons,
  caution,
})

/**
 * 可解释规则引擎：按载荷质量比、行程、介质和精度给 8 类仿生结构打分。
 * 分数只用于同一组约束下的相对排序。
 */
export const recommendSchemes = (input) => {
  const load = Number(input.load)
  const stroke = Number(input.stroke)
  const weight = Number(input.weightLimit)
  const specific = load / Math.max(weight, 0.05)
  const env = input.environment
  const precision = input.precision
  const wet = env === 'wet' || env === 'underwater'
  const media = envLabel(env)

  const gecko = scheme(
    1,
    '壁虎式干黏附足',
    '剥离角、预压力、接触面积',
    18
      + (['dry', 'vacuum', 'dust'].includes(env) ? 42 : 0)
      + (wet ? -28 : 0)
      + (stroke <= 40 ? 16 : 0)
      + (stroke > 120 ? -12 : 0)
      + (load <= 120 ? 10 : 0)
      + (env === 'highspeed' ? -8 : 0),
    [
      `载荷 ${load} N、剥离行程 ${stroke} mm。干黏附适合低压预载和短行程揭起，承载力靠接触面积放大，不靠胶水。`,
      `介质是「${media}」。${wet ? '水膜会隔开分子级接触，这项不能当主方案。' : '干燥、真空或轻粉尘更有利于范德华接触。'}`,
      '结构上要保证刚毛倾斜方向和剥离方向一致，并分区揭起，避免整足同时失黏。',
    ],
    wet ? '潮湿或水下不要把干黏附写成主承载方案。' : '表面粗糙度大于背衬顺应量时，真实接触面积会先崩溃。',
  )

  const honeycomb = scheme(
    2,
    '蜂巢夹层壁板',
    '芯层相对密度、面板厚度、芯高',
    24
      + (specific >= 40 ? 28 : 0)
      + (load >= 200 ? 18 : 0)
      + (stroke < 80 ? 12 : 0)
      + (weight <= 8 && load >= 80 ? 10 : 0)
      + (stroke >= 300 ? -10 : 0),
    [
      `载荷/质量约 ${specific.toFixed(1)} N/kg。这个比值高时，应把材料放到离中性面更远的面板上，而不是做成实心块。`,
      `行程 ${stroke} mm 更像结构包络而不是执行器行程，夹层板适合外壳、壁板和平台，不负责大位移。`,
      '校核顺序建议是：面板弯曲应力、芯层剪切、面板皱曲，最后再谈减重比例。',
    ],
    '开孔和螺钉处必须加嵌件，薄芯层经不起局部挤压。',
  )

  const shark = scheme(
    3,
    '鲨鱼皮沟槽蒙皮',
    '无量纲间距 s+、肋高间距比',
    8
      + (env === 'underwater' || env === 'highspeed' ? 46 : 0)
      + (env === 'wet' ? 16 : 0)
      + (precision === 'precision' ? 6 : 0)
      + (env === 'vacuum' || env === 'narrow' ? -8 : 0),
    [
      `当前介质「${media}」。沟槽减阻只作用于湍流边界层的摩擦阻力，低速层流里几乎没有收益。`,
      '几何不能照抄鳞片尺寸，要用摩擦速度把间距写成 s+，目标大约 15–20。',
      '它是表面方案，不承担主弯曲载荷；若同时要轻，还得另选夹层或中空梁。',
    ],
    '肋方向必须顺流。方向做反，减阻会变成增阻。',
  )

  const bone = scheme(
    4,
    '鸟骨式中空加肋梁',
    '径厚比、相对密度、主应力肋向',
    20
      + (weight <= 4 ? 24 : 0)
      + (specific >= 30 ? 22 : 0)
      + (load >= 40 ? 10 : 0)
      + (stroke >= 150 ? 8 : 0)
      + (env === 'narrow' ? 6 : 0),
    [
      `质量上限 ${weight} kg，载荷 ${load} N。弯曲构件应把材料远离中性轴，用中空截面换惯性矩。`,
      '内部肋要沿主弯矩布置。肋如果横着放，重量还在，刚度几乎不增加。',
      '端部连接、轴承座要局部实心化，否则减重会先从接头处失效。',
    ],
    '径厚比过大时，失效会从屈服变成局部屈曲，需要用加劲肋或点阵补稳定性。',
  )

  const bat = scheme(
    5,
    '蝙蝠式调频声呐',
    '带宽、双耳基线、脉冲间隔',
    6
      + (env === 'dust' || env === 'narrow' ? 36 : 0)
      + (precision === 'precision' ? 22 : 0)
      + (precision === 'normal' ? 8 : 0)
      + (env === 'underwater' ? 8 : 0)
      + (env === 'highspeed' ? -6 : 0),
    [
      `任务精度是「${precisionLabel(precision)}」，介质是「${media}」。粉尘、窄缝和缺少光照时，应补感知而不是继续加结构刚度。`,
      '距离分辨率大约随带宽提高，但空气里频率越高衰减越快，不能只把换能器换成更高频。',
      '它不提供承载力。若同时有载荷约束，需要和梁或夹层方案并列，而不是互相替代。',
    ],
    '发射和接收必须错开，否则自发声会淹没回波。',
  )

  const lotus = scheme(
    6,
    '荷叶式自清洁表面',
    '滚动角、固体面积分数、微柱间距',
    12
      + (env === 'wet' || env === 'dust' ? 40 : 0)
      + (env === 'dry' ? 8 : 0)
      + (env === 'underwater' ? -6 : 0)
      + (precision === 'precision' ? 8 : 0),
    [
      `介质「${media}」会把污染和液膜带到界面上。自清洁要看滚动角和接触角滞后，不能只报一个大于 150° 的接触角。`,
      '微结构必须维持 Cassie-Baxter 复合界面。液滴一旦被压进凹坑，超疏水状态就会失效。',
      precision === 'precision'
        ? '精密窗口还要同时满足透光或密封，织构深度不能破坏光学面形。'
        : '户外件要允许涂层再处理，沙蚀会先磨掉纳米尺度。',
    ],
    '水下长期浸泡不是荷叶表面的主场，长时间保压容易转入 Wenzel 状态。',
  )

  const beak = scheme(
    7,
    '翠鸟喙形整流外形',
    '长细比、截面变化率、肩部曲率',
    10
      + (env === 'highspeed' ? 42 : 0)
      + (env === 'underwater' ? 18 : 0)
      + (stroke >= 80 && stroke <= 500 ? 10 : 0)
      + (load >= 100 ? 6 : 0),
    [
      `行程尺度 ${stroke} mm、介质「${media}」。高速入水或高速气流里，先控制截面面积沿轴向的变化率，再谈局部装饰。`,
      '冲击压力大致随速度平方上升。把头部拉长、让曲率连续，是在削压力峰值和分离噪声。',
      '外形不代替内部承载。剩余冲击仍要用蜂窝或泡沫芯吸收。',
    ],
    '肩部如果出现台阶或曲率间断，会把已经避开的分离和噪声重新造出来。',
  )

  const snake = scheme(
    8,
    '蛇形多关节运动链',
    '曲率幅值、波长、摩擦比',
    14
      + (stroke >= 200 ? 30 : 0)
      + (env === 'narrow' ? 36 : 0)
      + (precision === 'rough' ? 8 : 0)
      + (precision === 'precision' ? -6 : 0)
      + (load > 400 ? -12 : 0)
      + (weight <= 6 ? 6 : 0),
    [
      `行程 ${stroke} mm、介质「${media}」。大行程加上狭窄通道时，冗余关节链比单根大直线执行器更容易通过弯折路径。`,
      '推进来自向后传播的曲率波和各向异性摩擦。只把模块串起来而摩擦各向同性，机构会原地扭动。',
      `精度目标是「${precisionLabel(precision)}」。模块越多，末端误差累积越明显，精密装配不是它的第一用途。`,
    ],
    load > 300 ? '大载荷会把细长关节链压成屈曲问题，需要先限制单节载荷。' : '至少要容纳一个完整波长，关节数过少无法形成有效步态。',
  )

  const ranked = [gecko, honeycomb, shark, bone, bat, lotus, beak, snake]
    .sort((left, right) => right.score - left.score || left.caseId - right.caseId)
    .slice(0, 3)
    .map((item, index) => ({
      ...item,
      rank: ['首选', '备选', '对照'][index],
    }))

  return {
    specificLoad: specific,
    media,
    precision: precisionLabel(precision),
    schemes: ranked,
  }
}
