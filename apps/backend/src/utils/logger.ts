import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'
const logLevel = process.env.LOG_LEVEL || 'info'
const logPretty = process.env.LOG_PRETTY === 'true' || isDevelopment

export const logger = pino({
  level: logLevel,
  ...(logPretty && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd/mm/yyyy HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  ...(!logPretty && {
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
})

export default logger
