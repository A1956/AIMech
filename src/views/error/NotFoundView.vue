<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <p class="text-6xl font-bold text-teal">404</p>
    <h1 class="mt-4 text-xl font-semibold">页面不存在</h1>
    <p class="mt-2 max-w-md text-sm text-mist">链接可能已失效，或你没有权限访问该地址。返回首页继续学习。</p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
      <el-button type="primary" @click="router.push('/')">回到首页</el-button>
      <el-button plain @click="router.back()">返回上一页</el-button>
    </div>
  </div>
</template>
