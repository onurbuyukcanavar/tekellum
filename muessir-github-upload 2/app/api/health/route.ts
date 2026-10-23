import { NextResponse } from 'next/server';
export function GET(){return NextResponse.json({ok:true,service:'muessir',timestamp:new Date().toISOString()});}
