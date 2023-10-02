import { getAttendances } from '../firebase/attendances'
import { prisma } from '../utils/prisma'
import { calculateRate } from './utils/calculateRate'
import { getAttendanceMap } from './utils/getAttendanceMap'

export async function reportByStudentsTags(
	orgKey: string,
	range: { from: Date; to: Date },
	tags: string[],
	order: 'asc' | 'desc' = 'asc',
	orderFactor: 'rate' | 'participantName' | 'activityName' = 'participantName'
): Promise<ReportRecord[]> {
	const participants = await getParticipantsByTags(orgKey, tags)
	const attendances = await getAttendances(orgKey, range)
	const [attendanceMap, activitiesId] = getAttendanceMap(attendances)

	const result = calculateRate(
		attendanceMap,
		await getActivities(orgKey, activitiesId),
		participants
	).sort((a, b) => {
		let aValue = a[orderFactor]
		let bValue = b[orderFactor]

		if (typeof aValue === 'string') {
			aValue = aValue.toLowerCase()
		}
		if (typeof bValue === 'string') {
			bValue = bValue.toLowerCase()
		}

		if (aValue === undefined) {
			return 1
		}
		if (bValue === undefined) {
			return -1
		}

		if (aValue === bValue) {
			return 0
		}

		return aValue > bValue ? 1 : -1
	})

	return order === 'asc' ? result : result.reverse()
}

type ReportRecord = {
	participantId: number
	participantName: string
	activityId: number
	activityName: string
	activityOuterId: string
	rate: number
}

function getParticipantsByTags(orgKey: string, tags: string[]) {
	return prisma.students.findMany({
		where: {
			tags: {
				hasEvery: tags,
			},
			// Only include participants from the organization
			organizationRecord: {
				key: orgKey,
			},
		},
		select: {
			id: true,
			outerId: true,
			name: true,
		},
	})
}

function getActivities(orgKey: string, outerIds: string[]) {
	return prisma.activities.findMany({
		where: {
			organization: {
				key: orgKey,
			},
			outerId: {
				in: outerIds,
			},
		},
		select: {
			id: true,
			outerId: true,
			name: true,
		},
	})
}
