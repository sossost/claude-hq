import { NextResponse } from 'next/server'

interface ApiSuccessResponse<T> {
  success: true
  data: T
}

interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status })
}

export function err(code: string, message: string, status = 400): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false as const, error: { code, message } }, { status })
}
