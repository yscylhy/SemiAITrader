'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState('testing...')

  useEffect(() => {
    async function test() {
      const supabase = createClient()
      const { data, error } = await supabase.from('accounts').select('*')
      
      if (error) {
        setStatus(`❌ 错误: ${error.message}`)
      } else {
        setStatus(`✅ 连接成功！accounts 表返回 ${data.length} 条数据`)
      }
    }
    test()
  }, [])

  return (
    <div style={{ padding: 40 }}>
      <h1>Supabase 连接测试</h1>
      <p>{status}</p>
    </div>
  )
}
