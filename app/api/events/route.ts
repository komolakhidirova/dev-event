import Event from '@/database/event.model'
import connectDB from '@/lib/mongodb'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	try {
		await connectDB()

		const formData = await req.formData()

		let event

		try {
			event = Object.fromEntries(formData.entries())
		} catch {
			return NextResponse.json(
				{
					message: 'Invalid JSON form data format',
				},
				{ status: 400 }
			)
		}

		const createdEvent = await Event.create(event)

		return NextResponse.json(
			{ message: 'Event created successfully', event: createdEvent },
			{ status: 201 }
		)
	} catch (e) {
		console.error(e)
		return NextResponse.json(
			{
				message: 'Event Creation Failed',
				error: e instanceof Error ? e.message : 'Unknown',
			},
			{ status: 500 }
		)
	}
}

export async function GET() {
	try {
		await connectDB()

		const events = await Event.find().sort({ createdAt: -1 })

		return NextResponse.json(
			{ message: 'Events fetched successfully', events },
			{ status: 200 }
		)
	} catch (e) {
		return NextResponse.json(
			{
				message: 'Event Fetching Failed',
				error: e,
			},
			{ status: 500 }
		)
	}
}
