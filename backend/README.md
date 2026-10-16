<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Database configuration

The backend loads database settings from `backend/.env` (or the process
environment) using the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and
`DB_NAME` variables. Set `DB_PASSWORD` to the password for the PostgreSQL user
configured by `DB_USER`; the Compose password only initializes a new database
volume and does not change the password in an existing volume.

On startup, database migrations assign official company numbers to existing
loads, add the origin/destination and optional driver assignment fields, and
create the required tables when they do not exist. Automatic schema
synchronization is disabled so startup does not issue destructive or
incompatible schema changes.

Load detail tracking fields, shift notes, broker and seal-photo data are
migrated on startup. Load documents and photos are stored under
`backend/uploads/<load-id>/` and served from `/uploads/`; this directory is
ignored by Git. Uploads accept JPEG, PNG, WebP, and PDF files up to 10 MB
(seal and securement photos must be images). Back up this directory alongside
the database, and use durable shared storage before running multiple backend
instances.

## Staged loads and load-board accounts

The load migration adds `DRAFT`, `QUOTED`, and `PENDING_ASSIGNMENT` staging
statuses, dispatcher-scoped temporary numbers (`DISP-<USERNAME>-<SEQUENCE>`),
starting at sequence 101, and year-scoped company numbers
(`LD-<YEAR>-<SEQUENCE>`), starting at sequence 1001. The server assigns both
numbers. Assigning both a driver and truck unit promotes a draft to `ASSIGNED`
and allocates its company number. Pickup and delivery dates are saved with each
load. Existing loads are assigned company numbers during migration so they
remain on the operational board.

Load-board routes require an authenticated load-board account. Configure these
independent settings in the backend environment before first login:

- `LOADS_ADMIN_USERNAME`: username for the initial administrator account.
- `LOADS_ADMIN_PASSWORD`: initial administrator password, at least 16
  characters.
- `LOADS_SESSION_SECRET`: independent random signing secret, at least 32
  characters, for eight-hour HTTP-only session cookies.

The initial administrator is created the first time a login is attempted, if
the load-board account table is empty. Admins and owners can provision
dispatcher, dispatch-manager, owner, admin, and driver accounts from the load
board. When creating a driver account, link it to its driver-directory record.
Drivers can see only operational loads assigned to that linked driver and can
report sequential trip milestones from the mobile Driver Portal
(`ASSIGNED` → `DISPATCHED` → `AT_PICKUP` → `IN_TRANSIT` → `AT_DELIVERY`).
Uploading a POD moves an active operational load to `DELIVERED`. Dispatchers
can see their own drafts and operational loads; managers and owners can see all
loads. Keep the load-board credentials and signing secret separate from
Compliance credentials and never commit them.

## Private Compliance documents

Compliance records and their document downloads require the single administrator
login. Saving a compliance profile also creates or links its driver-directory
record, so it is available in load assignment and the Drivers page. Matching is
limited to a unique email plus first/last name, or a unique phone plus full
name; ambiguous matches create a separate driver rather than linking the wrong
person. Existing compliance profiles are linked or added to the driver
directory by the startup migration. Removing a compliance profile does not
remove the driver-directory record or affect assigned loads.

Configure these backend environment variables before using the Compliance
module:

- `COMPLIANCE_ADMIN_USERNAME`: the administrator login name.
- `COMPLIANCE_ADMIN_PASSWORD`: a strong password with at least 16 characters.
- `COMPLIANCE_SESSION_SECRET`: a randomly generated value of at least 32
  characters used to sign eight-hour, HTTP-only, SameSite=Strict session
  cookies.
- `COMPLIANCE_FILE_ENCRYPTION_KEY`: exactly 64 hexadecimal characters (32
  random bytes) for AES-256-GCM file encryption.
- `COMPLIANCE_PRIVATE_FILES_DIRECTORY`: optional private storage path. The
  default is `backend/private-compliance-files/`; it must not be placed under
  the public `backend/uploads/` directory.
- `FRONTEND_ORIGIN`: the exact frontend origin allowed by CORS and mutating
  request origin checks; defaults to `http://localhost:3001`.

Generate independent secrets using Node.js, for example:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use a generated value for the session secret and a separate generated value for
the file encryption key. Set the username and password only in the backend
environment; never expose them as `NEXT_PUBLIC_*` variables or commit them.
Compliance uploads accept PDF, JPEG, PNG, and WebP files up to 10 MB. Files are
kept outside the public static directory, encrypted at rest, downloaded only
through an authenticated endpoint, and returned as attachment downloads.
Back up the encrypted private directory and the encryption key separately;
documents cannot be recovered if the key is lost. Production deployments must
use HTTPS and keep the frontend and API on the same site so strict cookies are
sent.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. Create a free account at [observe.nestjs.com](https://observe.nestjs.com), add an application, and paste the generated app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
