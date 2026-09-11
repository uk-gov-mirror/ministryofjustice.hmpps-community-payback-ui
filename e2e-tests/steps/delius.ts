import { login as deliusLogin } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/login'
import { checkAppointmentOnDelius as _checkAppointmentOnDelius } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/upw/checkAppointmentDetails'
import { Page, expect } from '@playwright/test'
import {
  getRowByContent,
  getRowCellsByContent,
} from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/utils/table'
import { findOffenderByCRN } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/offender/find-offender'
import { Contact, Team } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/test-data/test-data'
import { verifyContacts } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/contact/find-contacts'
import { selectOption } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/utils/inputs'
import { waitForAjax } from '@ministryofjustice/hmpps-probation-integration-e2e-tests/steps/delius/utils/refresh'
import Project from '../delius/project'
import PersonOnProbation from '../delius/personOnProbation'

export interface ContactOutcome {
  outcome: string
  notes?: string
  startTime?: string
  endTime?: string
}

export const checkAppointmentOnDelius = async ({
  page,
  team,
  person,
  project,
  contactOutcome,
  hoursCredited,
  outStanding,
}: {
  page: Page
  team: Team
  person: PersonOnProbation
  project: Project
  contactOutcome: ContactOutcome
  hoursCredited?: string
  outStanding?: string
}) => {
  await deliusLogin(page)
  await page.getByRole('link', { name: 'UPW Project Diary' }).click()
  await page.waitForSelector('span.float-start:has-text("UPW Project Diary")')
  await _checkAppointmentOnDelius(page, {
    teamProvider: team.provider,
    teamName: team.name,
    projectName: project.name,
    popCrn: person.crn,
    popName: person.getDisplayName(),
    startTime: contactOutcome.startTime ?? project.availability.startTime,
    endTime: contactOutcome.endTime ?? project.availability.endTime,
    outcome: contactOutcome.outcome,
    hoursCredited,
    outStanding,
  })
}

export interface AttendanceSummary {
  appointmentsOffered: number
  appointmentsComplied: number
  appointmentsNotComplied: number
}

export const checkDeliusAppointmentOnWorksheetSummary = async ({
  page,
  person,
  project,
  contactOutcome,
  hoursOffered,
  hoursCredited,
  attendanceSummary,
}: {
  page: Page
  person: PersonOnProbation
  project: Project
  contactOutcome: ContactOutcome
  hoursOffered: string
  hoursCredited: string
  attendanceSummary: AttendanceSummary
}) => {
  await findOffenderByCRN(page, person.crn)
  await page.locator('span.float-start:has-text("Case Summary")').waitFor()

  await page.getByRole('button', { name: 'Current Events' }).click()
  await page.getByRole('link', { name: 'view event' }).click()
  await page.locator('span.float-start:has-text("Event Details")').waitFor()

  await page.getByRole('link', { name: 'Unpaid Work' }).click()
  await page.locator('span.float-start:has-text("View UPW Details")').waitFor()

  await page.getByRole('button', { name: 'Worksheet Summary' }).click()
  await page.locator('span.float-start:has-text("UPW Worksheet Summary")').waitFor()

  const projectAppointmentCells = await getRowCellsByContent(page, 'appointmentsTable', project.name)
  expect(projectAppointmentCells[1]).toContain(project.name)
  expect(projectAppointmentCells[2]).toContain(hoursOffered)
  expect(projectAppointmentCells[3]).toContain(hoursCredited)
  expect(projectAppointmentCells[6]).toContain(contactOutcome.outcome)

  const attendanceTable = page.getByRole('table').nth(2)
  const valuesRow = attendanceTable.getByRole('row').nth(2)
  const attendanceValues = await valuesRow.getByRole('cell').allTextContents()

  expect(attendanceValues[0]).toContain(attendanceSummary.appointmentsOffered.toString())
  expect(attendanceValues[1]).toContain(attendanceSummary.appointmentsComplied.toString())
  expect(attendanceValues[2]).toContain(attendanceSummary.appointmentsNotComplied.toString())
}

export const checkDeliusAppointmentDetails = async ({
  page,
  project,
  contactOutcome,
  hoursWorked,
  hoursCredited,
  enforcementAction,
}: {
  page: Page
  project: Project
  contactOutcome: ContactOutcome
  hoursWorked: string
  hoursCredited: string
  enforcementAction?: string
}) => {
  const projectAppointmentRow = await getRowByContent(page, 'appointmentsTable', project.name)
  await projectAppointmentRow.getByRole('link', { name: 'view' }).click()

  await page.locator('span.float-start:has-text("View UPW Appointment")').waitFor()

  await expect(page.locator('div.row.mb-sm-2:has-text("Project:") > [id$=":outputText"]')).toContainText(project.name)
  await expect(page.locator('div.row.mb-sm-2:has-text("Start Time:") > [id$=":outputText"]')).toContainText(
    contactOutcome.startTime,
  )
  await expect(page.locator('div.row.mb-sm-2:has-text("End Time:") > [id$=":outputText"]')).toContainText(
    contactOutcome.endTime,
  )
  await expect(page.locator('div.row.mb-sm-2:has-text("Contact Outcome:") > [id$=":outputText"]')).toContainText(
    contactOutcome.outcome,
  )
  await expect(page.locator('div.row.mb-sm-2:has-text("Hours Worked:") > [id$=":outputText"]')).toContainText(
    hoursWorked,
  )
  await expect(page.locator('div.row.mb-sm-2:has-text("Hours Credited:") > [id$=":outputText"]')).toContainText(
    hoursCredited,
  )

  if (enforcementAction) {
    await expect(page.locator('div.row.mb-sm-2:has-text("Enforcement Action:") > [id$=":outputText"]')).toContainText(
      enforcementAction,
    )
  } else {
    await expect(page.locator('div.row.mb-sm-2:has-text("Enforcement Action") > [id$=":outputText"]')).not.toBeVisible()
  }
}

export const checkDeliusContactList = async ({
  page,
  person,
  contacts,
}: {
  page: Page
  person: PersonOnProbation
  contacts: Contact[]
}) => {
  await verifyContacts(page, person.crn, contacts)
}

export const checkDeliusEnforcementDiary = async ({
  page,
  person,
  region,
  team,
  exists,
}: {
  page: Page
  person: PersonOnProbation
  region: string
  team: string
  exists: boolean
}) => {
  await page.getByRole('link', { name: 'Officer Diary' }).click()
  await page.getByRole('link', { name: 'Enforcement Contacts' }).click()

  await page.locator('span.float-start:has-text("Enforcement Contacts")').waitFor()

  await selectOption(page, '#trust\\:selectOneMenu', region)
  await selectOption(page, '#team\\:selectOneMenu', team)
  await selectOption(page, '#officer\\:selectOneMenu', 'All Officers')
  await selectOption(page, '#allTeams\\:selectOneMenu', 'No')
  await selectOption(page, '#filter\\:selectOneMenu', 'Enforcement Action')

  await page.getByRole('button', { name: 'Search' }).click()

  await page.getByRole('link', { name: 'Date', description: 'Date' }).click()
  await waitForAjax(page)
  await page.getByRole('link', { name: 'Date', description: 'Date' }).click()
  await waitForAjax(page)

  if (exists) {
    const enforcementContactRow = await getRowByContent(page, 'enforcementContactTable', person.getFullName(true))
    await expect(enforcementContactRow).toBeVisible()
  } else {
    await expectRowIsNotPresent(page, 'enforcementContactTable', person.getFullName(true))
  }
}

async function expectRowIsNotPresent(page: Page, tableId: string, content: string) {
  const tableLocator = page.locator(`#${tableId}`)
  await expect(tableLocator).toBeVisible()
  const row = tableLocator.getByRole('row').filter({ hasText: content })

  const nextLink = page.getByRole('link', { name: 'Next' })
  /* eslint-disable no-await-in-loop */
  while (await nextLink.isVisible()) {
    await expect(row).not.toBeVisible()
    nextLink.click()
    await waitForAjax(page)
  }
  /* eslint-enable no-await-in-loop */
}
