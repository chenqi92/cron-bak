<template>
  <div class="chart-container">
    <div v-if="loading" class="loading-container">
      <n-spin size="large" />
      <p>{{ $t('common.loading') }}</p>
    </div>
    <div v-else-if="!data || data.length === 0" class="empty-container">
      <n-empty :description="$t('common.noData')" />
    </div>
    <div v-else ref="chartRef" class="chart" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts'

interface ChartDataItem {
  date: string
  successful: number
  failed: number
  total: number
}

interface Props {
  data: ChartDataItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  periodChange: [period: string]
}>()

const { t } = useI18n()
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: [t('dashboard.successful'), t('dashboard.failed')]
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.data.map(item => item.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: t('dashboard.successful'),
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          color: '#18a058'
        },
        areaStyle: {
          color: 'rgba(24, 160, 88, 0.1)'
        },
        data: props.data.map(item => item.successful)
      },
      {
        name: t('dashboard.failed'),
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          color: '#d03050'
        },
        areaStyle: {
          color: 'rgba(208, 48, 80, 0.1)'
        },
        data: props.data.map(item => item.failed)
      }
    ]
  }

  chartInstance.setOption(option)
}

const updateChart = () => {
  if (!chartInstance) return

  chartInstance.setOption({
    xAxis: {
      data: props.data.map(item => item.date)
    },
    series: [
      {
        data: props.data.map(item => item.successful)
      },
      {
        data: props.data.map(item => item.failed)
      }
    ]
  })
}

const resizeChart = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// Watch for data changes
watch(() => props.data, () => {
  if (chartInstance) {
    updateChart()
  }
}, { deep: true })

// Watch for loading state
watch(() => props.loading, (loading) => {
  if (!loading && chartRef.value && !chartInstance) {
    nextTick(() => {
      initChart()
    })
  }
})

onMounted(() => {
  if (!props.loading && props.data.length > 0) {
    nextTick(() => {
      initChart()
    })
  }
  
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
  window.removeEventListener('resize', resizeChart)
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.loading-container p {
  margin-top: 16px;
  font-size: 14px;
}
</style>
