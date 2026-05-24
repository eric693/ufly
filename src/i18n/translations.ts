export type Lang = 'zh-TW' | 'en' | 'zh-CN'

const translations = {
  'zh-TW': {
    nav: {
      home: '首頁', order: '下單', tracking: '追蹤', history: '活動', profile: '帳戶',
      dashboard: '儀表板', orders: '訂單管理', drivers: '夥伴管理', map: '即時地圖',
      analytics: '數據分析', customers: '客戶管理', settings: '系統設定', disputes: '爭議管理',
      back: '返回前台', earnings: '收益', billing: '帳單', webhooks: 'Webhook',
    },
    status: {
      pending: '等待中', matching: '媒合中', accepted: '已接單',
      pickup: '取件中', delivering: '配送中', completed: '已送達', cancelled: '已取消',
    },
    dispute: {
      title: '申訴爭議', submit: '提交申訴', reason: '爭議原因', description: '詳細說明',
      reasons: { fee: '費用爭議', damage: '物品損壞', quality: '服務品質', delay: '配送延誤', other: '其他' },
      statusLabels: { open: '待處理', investigating: '調查中', resolved: '已解決', rejected: '已駁回' },
      placeholder: '請描述您遇到的問題（最多 1000 字）',
      successMsg: '申訴已提交，我們將在 3 個工作天內回覆',
      errorDup: '此訂單已提交申訴',
    },
    webhook: {
      title: 'Webhook 管理', add: '新增 Webhook', url: 'Endpoint URL', events: '事件類型',
      secret: '簽名金鑰', deliveries: '傳送記錄', active: '啟用', inactive: '停用',
      noEndpoints: '尚未設定 Webhook', rotate: '重新產生金鑰',
      hint: '訂單狀態變更時，Ufly 將以 POST 方式推送 JSON 至您的伺服器',
    },
    billing: {
      title: '月結帳單', export: '列印 / 匯出 PDF', period: '帳單週期',
      totalOrders: '總訂單數', completedOrders: '完成訂單', totalAmount: '總金額',
      noData: '本月尚無訂單記錄',
    },
    earnings: {
      title: '我的收益', allTime: '全部', monthly: '月結',
      cumulative: '累計收益（我的份）', completed: '完成訂單', rating: '平均評分',
      commission: '抽成比例', chart: '每日收益', trips: '趟次記錄',
      settlement: '結算狀態', unsettled: '未結算', settled: '已結算',
      noTrips: '本期無紀錄',
    },
    common: {
      cancel: '取消', confirm: '確認', save: '儲存', delete: '刪除', close: '關閉',
      loading: '載入中…', error: '發生錯誤', success: '操作成功',
      submit: '提交', back: '返回', view: '查看', edit: '編輯',
    },
    lang: { label: '語言', 'zh-TW': '繁體中文', en: 'English', 'zh-CN': '简体中文' },
  },

  'en': {
    nav: {
      home: 'Home', order: 'Order', tracking: 'Track', history: 'History', profile: 'Account',
      dashboard: 'Dashboard', orders: 'Orders', drivers: 'Drivers', map: 'Live Map',
      analytics: 'Analytics', customers: 'Customers', settings: 'Settings', disputes: 'Disputes',
      back: 'Back to Site', earnings: 'Earnings', billing: 'Billing', webhooks: 'Webhooks',
    },
    status: {
      pending: 'Pending', matching: 'Matching', accepted: 'Accepted',
      pickup: 'Picking Up', delivering: 'Delivering', completed: 'Delivered', cancelled: 'Cancelled',
    },
    dispute: {
      title: 'File a Dispute', submit: 'Submit Dispute', reason: 'Reason', description: 'Description',
      reasons: { fee: 'Fee Dispute', damage: 'Item Damaged', quality: 'Service Quality', delay: 'Delivery Delay', other: 'Other' },
      statusLabels: { open: 'Open', investigating: 'Investigating', resolved: 'Resolved', rejected: 'Rejected' },
      placeholder: 'Describe the issue in detail (up to 1000 characters)',
      successMsg: 'Dispute submitted. We will respond within 3 business days.',
      errorDup: 'A dispute for this order already exists',
    },
    webhook: {
      title: 'Webhook Management', add: 'Add Webhook', url: 'Endpoint URL', events: 'Events',
      secret: 'Signing Secret', deliveries: 'Delivery Logs', active: 'Active', inactive: 'Inactive',
      noEndpoints: 'No webhooks configured', rotate: 'Rotate Secret',
      hint: 'Ufly will POST a JSON payload to your server when order status changes',
    },
    billing: {
      title: 'Monthly Billing', export: 'Print / Export PDF', period: 'Billing Period',
      totalOrders: 'Total Orders', completedOrders: 'Completed', totalAmount: 'Total Amount',
      noData: 'No orders this month',
    },
    earnings: {
      title: 'My Earnings', allTime: 'All Time', monthly: 'Monthly',
      cumulative: 'Earnings (My Share)', completed: 'Completed Orders', rating: 'Avg Rating',
      commission: 'Commission Rate', chart: 'Daily Earnings', trips: 'Trip History',
      settlement: 'Settlement', unsettled: 'Unsettled', settled: 'Settled',
      noTrips: 'No records for this period',
    },
    common: {
      cancel: 'Cancel', confirm: 'Confirm', save: 'Save', delete: 'Delete', close: 'Close',
      loading: 'Loading…', error: 'An error occurred', success: 'Success',
      submit: 'Submit', back: 'Back', view: 'View', edit: 'Edit',
    },
    lang: { label: 'Language', 'zh-TW': '繁體中文', en: 'English', 'zh-CN': '简体中文' },
  },

  'zh-CN': {
    nav: {
      home: '首页', order: '下单', tracking: '追踪', history: '活动', profile: '账户',
      dashboard: '仪表板', orders: '订单管理', drivers: '伙伴管理', map: '实时地图',
      analytics: '数据分析', customers: '客户管理', settings: '系统设置', disputes: '争议管理',
      back: '返回前台', earnings: '收益', billing: '账单', webhooks: 'Webhook',
    },
    status: {
      pending: '等待中', matching: '匹配中', accepted: '已接单',
      pickup: '取件中', delivering: '配送中', completed: '已送达', cancelled: '已取消',
    },
    dispute: {
      title: '申诉争议', submit: '提交申诉', reason: '争议原因', description: '详细说明',
      reasons: { fee: '费用争议', damage: '物品损坏', quality: '服务质量', delay: '配送延迟', other: '其他' },
      statusLabels: { open: '待处理', investigating: '调查中', resolved: '已解决', rejected: '已驳回' },
      placeholder: '请描述您遇到的问题（最多 1000 字）',
      successMsg: '申诉已提交，我们将在 3 个工作日内回复',
      errorDup: '此订单已提交申诉',
    },
    webhook: {
      title: 'Webhook 管理', add: '新增 Webhook', url: 'Endpoint URL', events: '事件类型',
      secret: '签名密钥', deliveries: '发送记录', active: '启用', inactive: '停用',
      noEndpoints: '尚未配置 Webhook', rotate: '重新生成密钥',
      hint: '订单状态变更时，Ufly 将以 POST 方式推送 JSON 至您的服务器',
    },
    billing: {
      title: '月结账单', export: '打印 / 导出 PDF', period: '账单周期',
      totalOrders: '总订单数', completedOrders: '完成订单', totalAmount: '总金额',
      noData: '本月暂无订单记录',
    },
    earnings: {
      title: '我的收益', allTime: '全部', monthly: '月结',
      cumulative: '累计收益（我的份）', completed: '完成订单', rating: '平均评分',
      commission: '抽成比例', chart: '每日收益', trips: '行程记录',
      settlement: '结算状态', unsettled: '未结算', settled: '已结算',
      noTrips: '本期无记录',
    },
    common: {
      cancel: '取消', confirm: '确认', save: '保存', delete: '删除', close: '关闭',
      loading: '加载中…', error: '发生错误', success: '操作成功',
      submit: '提交', back: '返回', view: '查看', edit: '编辑',
    },
    lang: { label: '语言', 'zh-TW': '繁體中文', en: 'English', 'zh-CN': '简体中文' },
  },
} as const

export default translations
