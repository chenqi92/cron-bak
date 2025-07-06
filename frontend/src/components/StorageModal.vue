<template>
  <n-modal v-model:show="showModal" preset="dialog" :title="isEdit ? '编辑存储库' : '创建存储库'">
    <n-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="auto"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="存储库名称" path="name">
        <n-input v-model:value="formData.name" placeholder="请输入存储库名称" />
      </n-form-item>

      <n-form-item label="存储库类型" path="type">
        <n-select
          v-model:value="formData.type"
          :options="typeOptions"
          placeholder="请选择存储库类型"
          @update:value="handleTypeChange"
        />
      </n-form-item>

      <!-- MySQL Configuration -->
      <template v-if="formData.type === 'mysql'">
        <n-form-item label="主机地址" path="config.host">
          <n-input v-model:value="formData.config.host" placeholder="localhost" />
        </n-form-item>
        <n-form-item label="端口" path="config.port">
          <n-input-number v-model:value="formData.config.port" :min="1" :max="65535" placeholder="3306" />
        </n-form-item>
        <n-form-item label="用户名" path="config.username">
          <n-input v-model:value="formData.config.username" placeholder="root" />
        </n-form-item>
        <n-form-item label="密码" path="config.password">
          <n-input v-model:value="formData.config.password" type="password" placeholder="请输入密码" />
        </n-form-item>
        <n-form-item label="数据库名" path="config.database">
          <n-input v-model:value="formData.config.database" placeholder="请输入数据库名" />
        </n-form-item>
      </template>

      <!-- MinIO/S3 Configuration -->
      <template v-if="formData.type === 'minio' || formData.type === 's3'">
        <n-form-item label="端点地址" path="config.endpoint">
          <n-input v-model:value="formData.config.endpoint" placeholder="localhost" />
        </n-form-item>
        <n-form-item label="端口" path="config.port">
          <n-input-number v-model:value="formData.config.port" :min="1" :max="65535" placeholder="9000" />
        </n-form-item>
        <n-form-item label="Access Key" path="config.accessKey">
          <n-input v-model:value="formData.config.accessKey" placeholder="请输入Access Key" />
        </n-form-item>
        <n-form-item label="Secret Key" path="config.secretKey">
          <n-input v-model:value="formData.config.secretKey" type="password" placeholder="请输入Secret Key" />
        </n-form-item>
        <n-form-item label="存储桶" path="config.bucket">
          <n-input v-model:value="formData.config.bucket" placeholder="请输入存储桶名称" />
        </n-form-item>
        <n-form-item label="使用SSL">
          <n-switch v-model:value="formData.config.useSSL" />
        </n-form-item>
      </template>

      <!-- SMB Configuration -->
      <template v-if="formData.type === 'smb'">
        <n-form-item label="主机地址" path="config.host">
          <n-input v-model:value="formData.config.host" placeholder="192.168.1.100" />
        </n-form-item>
        <n-form-item label="共享路径" path="config.sharePath">
          <n-input v-model:value="formData.config.sharePath" placeholder="\\\\server\\share" />
        </n-form-item>
        <n-form-item label="用户名" path="config.username">
          <n-input v-model:value="formData.config.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码" path="config.password">
          <n-input v-model:value="formData.config.password" type="password" placeholder="请输入密码" />
        </n-form-item>
        <n-form-item label="域" path="config.domain">
          <n-input v-model:value="formData.config.domain" placeholder="WORKGROUP (可选)" />
        </n-form-item>
      </template>
    </n-form>

    <template #action>
      <n-space>
        <n-button @click="handleCancel">取消</n-button>
        <n-button @click="handleTest" :loading="testing" type="info">测试连接</n-button>
        <n-button @click="handleSubmit" :loading="submitting" type="primary">
          {{ isEdit ? '更新' : '创建' }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import { useStorageStore } from '@/stores/storage'
import type { Storage, CreateStorageRequest, StorageConfig } from '@/types'

interface Props {
  show: boolean
  storage?: Storage | null
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const message = useMessage()
const storageStore = useStorageStore()

// Reactive data
const formRef = ref()
const submitting = ref(false)
const testing = ref(false)

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const isEdit = computed(() => !!props.storage)

const formData = ref<CreateStorageRequest>({
  name: '',
  type: 'mysql',
  config: {}
})

const typeOptions = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'MinIO', value: 'minio' },
  { label: 'S3', value: 's3' },
  { label: 'SMB', value: 'smb' }
]

const formRules = {
  name: [
    { required: true, message: '请输入存储库名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择存储库类型', trigger: 'change' }
  ],
  'config.host': [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  'config.username': [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  'config.password': [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  'config.database': [
    { required: true, message: '请输入数据库名', trigger: 'blur' }
  ],
  'config.endpoint': [
    { required: true, message: '请输入端点地址', trigger: 'blur' }
  ],
  'config.accessKey': [
    { required: true, message: '请输入Access Key', trigger: 'blur' }
  ],
  'config.secretKey': [
    { required: true, message: '请输入Secret Key', trigger: 'blur' }
  ],
  'config.bucket': [
    { required: true, message: '请输入存储桶名称', trigger: 'blur' }
  ],
  'config.sharePath': [
    { required: true, message: '请输入共享路径', trigger: 'blur' }
  ]
}

// Methods
const resetForm = () => {
  formData.value = {
    name: '',
    type: 'mysql',
    config: {}
  }
}

const initForm = () => {
  if (props.storage) {
    formData.value = {
      name: props.storage.name,
      type: props.storage.type,
      config: { ...props.storage.config }
    }
  } else {
    resetForm()
  }
}

const handleTypeChange = () => {
  // Reset config when type changes
  formData.value.config = getDefaultConfig(formData.value.type)
}

const getDefaultConfig = (type: string): StorageConfig => {
  switch (type) {
    case 'mysql':
      return {
        host: 'localhost',
        port: 3306,
        username: '',
        password: '',
        database: ''
      }
    case 'minio':
      return {
        endpoint: 'localhost',
        port: 9000,
        accessKey: '',
        secretKey: '',
        bucket: '',
        useSSL: false
      }
    case 's3':
      return {
        endpoint: 's3.amazonaws.com',
        port: 443,
        accessKey: '',
        secretKey: '',
        bucket: '',
        useSSL: true
      }
    case 'smb':
      return {
        host: '',
        sharePath: '',
        username: '',
        password: '',
        domain: ''
      }
    default:
      return {}
  }
}

const handleTest = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    message.error('请先完善配置信息')
    return
  }

  testing.value = true
  try {
    // Create a temporary storage for testing
    const tempStorage = await storageStore.createStorage(formData.value)
    if (tempStorage.success && tempStorage.data) {
      const testResult = await storageStore.testStorage(tempStorage.data.id)
      
      // Delete the temporary storage
      await storageStore.deleteStorage(tempStorage.data.id)
      
      if (testResult.success && testResult.data?.testResult.success) {
        message.success('连接测试成功！')
      } else {
        message.error(`连接测试失败: ${testResult.data?.testResult.error || testResult.error}`)
      }
    } else {
      message.error('测试失败: 无法创建临时存储库')
    }
  } catch (error: any) {
    message.error(`测试失败: ${error.message}`)
  } finally {
    testing.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    let result
    if (isEdit.value && props.storage) {
      result = await storageStore.updateStorage(props.storage.id, formData.value)
    } else {
      result = await storageStore.createStorage(formData.value)
    }

    if (result.success) {
      message.success(isEdit.value ? '存储库更新成功' : '存储库创建成功')
      emit('success')
    } else {
      message.error(result.error || (isEdit.value ? '更新失败' : '创建失败'))
    }
  } finally {
    submitting.value = false
  }
}

const handleCancel = () => {
  showModal.value = false
}

// Watch for modal show/hide
watch(() => props.show, (show) => {
  if (show) {
    nextTick(() => {
      initForm()
    })
  }
})
</script>
