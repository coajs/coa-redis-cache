import { expect } from 'chai'
import { random } from 'lodash'
import { RedisBin } from '../src/RedisBin'
import { RedisCache } from '../src/RedisCache'

const redisConfig = {
  // 服务器地址
  host: '127.0.0.1',
  // 端口
  port: 6379,
  // 密码，若无填空字符串
  password: '',
  // 数据库，默认为0
  db: 0,
  // 键前缀，可区分不同的项目
  prefix: 'pre_',
  // 是否回显查询语句
  trace: true,
}

// 创建一个基础配置实例，后续所有的组件的使用均依赖此配置实例
// 一般一个数据库只需要使用一个实例，内部会管理连接池，无需创建多个
const redisBin = new RedisBin(redisConfig)

// 创建一个缓存实例
const redisCache = new RedisCache(redisBin)

describe.only('RedisCacheV2 class test', function () {
  it('test set', async () => {
    const setResult = await redisCache.set('1', 'a', 'abc' + random(1000))

    expect(setResult).to.eq(1)
  })
})
