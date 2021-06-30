import * as Redis from 'ioredis'

export { Redis }

export namespace CoaRedis {
  export interface Dic<T> {
    [key: string]: T
  }

  export interface Config {
    host: string
    port: number
    db: number
    password: string
    ttl: number
    prefix: string
    trace: boolean
  }
}
