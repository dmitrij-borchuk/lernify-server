import fastify from 'fastify'
import { fastifyRequestContextPlugin } from '@fastify/request-context'
import { cert, initializeApp } from 'firebase-admin/app'
import { isProduction, PORT } from './config'
import authService from './auth/index'
import organizationsService from './organizations'
import studentsService from './students'
import usersService from './users'
import { testConnection } from './utils/postgres'
import { CLIENT_EMAIL, PRIVATE_KEY, PROJECT_ID } from './auth/config'
import { decorateWithAuth } from './auth/authDecorators'
import { decorateOrgPermission } from './auth/orgAccessDecorator'
import databaseConnector from './databaseConnector'
import { setCurrentUserHook } from './hooks/setCurrentUserHook'

// https://github.com/ajv-validator/ajv
// https://github.com/sinclairzx81/typebox

export async function initApp() {
	// TODO: move to separate plugin
	initializeApp({
		credential: cert({
			projectId: PROJECT_ID,
			clientEmail: CLIENT_EMAIL,
			privateKey: PRIVATE_KEY,
		}),
	})
	const app = fastify({
		logger: {
			prettyPrint: !isProduction
				? {
						translateTime: 'yyyy-mm-dd HH:MM:ss Z',
						ignore: 'pid,hostname',
				  }
				: false,
		},
		// ajv: {},
	})
	app.log.info('Initializing an application')

	app.register(fastifyRequestContextPlugin, {
		hook: 'preHandler',
		defaultStoreValues: {
			decodedIdToken: undefined,
		},
	})

	app.register(databaseConnector)

	app.after(async () => {
		await testConnection(app)
		app.log.info('Database connection successful')
	})
	app.register(require('@fastify/cors'))

	// These decorators should be initialized before other handlers
	// TODO: use plugin
	decorateWithAuth(app)
	decorateOrgPermission(app)

	await app.register(authService, { prefix: '/auth' })

	setCurrentUserHook(app)

	await app.register(organizationsService, { prefix: '/organizations' })
	await app.register(studentsService, { prefix: '/students' })

	await app.register(usersService, { prefix: '/users' })

	app.after(routes)

	function routes() {
		app.get('/ping', async function (req, reply) {
			reply.status(200)
			return reply.send('OK')
		})
	}

	app.listen(PORT, '0.0.0.0')
}
