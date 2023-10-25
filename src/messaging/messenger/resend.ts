import { Resend } from 'resend'
import { Messenger } from '../types'

export function send() {}

export class ResendMessenger implements Messenger {
	private resend: Resend
	constructor() {
		this.resend = new Resend(process.env.RESEND_API_KEY)
	}

	async send(from: string, to: string, subject: string, html: string) {
		await this.resend.emails.send({
			from,
			to,
			subject,
			html,
		})
	}
}
