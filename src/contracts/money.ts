import { z } from 'zod'

export const decimalStringSchema = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,18})?$/, 'Valor ETH inválido.')

export const quantitySchema = z.number().int().positive()
