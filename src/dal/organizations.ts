import { Pool } from 'pg'
import { OrganizationRecord } from '../organizations/types'

export async function getOrganizationByIdQuery(client: Pool, id: number) {
	return await client.query<OrganizationRecord>(
		`SELECT * FROM "organizations"
		WHERE "id" = $1`,
		[id]
	)
}
