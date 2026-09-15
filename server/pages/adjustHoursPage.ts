import { AdjustmentReasonDto } from '../@types/shared'
import { GovUkRadioOrCheckboxOption, ValidationErrors, ViewDataWithTimeToCredit } from '../@types/user-defined'
import HoursAndMinutesInput, { ObjectWithHoursAndMinutes } from '../forms/hoursAndMinutesInput'
import MojDateInput from '../forms/mojDateInput'
import Offender from '../models/offender'
import paths from '../paths'
import { pathWithQuery } from '../utils/utils'
import PageWithValidation from './pageWithValidation'

type AdjustHoursBody = {
  date?: string
  reasonCode: string
} & ObjectWithHoursAndMinutes

type PageViewData = {
  date: string
  backLink: string
  heading: { title: string; caption: string }
  updatePath: string
  adjustmentOptions: AdjustmentOption[]
} & ViewDataWithTimeToCredit

type AdjustmentOption = GovUkRadioOrCheckboxOption & {
  hint: {
    html: string
  }
}

export default class AdjustHoursPage extends PageWithValidation<AdjustHoursBody> {
  protected getValidationErrors(body: AdjustHoursBody): ValidationErrors<AdjustHoursBody> {
    const errors: ValidationErrors<AdjustHoursBody> = {}

    const dateError = MojDateInput.validate(body.date)

    if (dateError) {
      errors.date = dateError
    }

    if (!body.reasonCode) {
      errors.reasonCode = { text: 'Select a reason' }
    }

    const timeErrors = HoursAndMinutesInput.validationErrors(body, 'time taken off')

    return {
      ...errors,
      ...timeErrors,
    }
  }

  viewData({
    offender,
    body,
    adjustmentReasons,
    deliusEventNumber,
  }: {
    offender: Offender
    body: AdjustHoursBody
    adjustmentReasons: AdjustmentReasonDto[]
    deliusEventNumber: string
  }): PageViewData {
    const { name, crn } = offender

    const exitPath = ''
    let date = ''

    if (body?.date !== undefined) {
      date = body.date
    }

    return {
      date,
      heading: { title: name, caption: crn },
      backLink: exitPath,
      updatePath: paths.people.adjustHours.update({ crn: offender.crn, deliusEventNumber }),
      adjustmentOptions: this.getAdjustmentOptions(adjustmentReasons, body),
      timeToCredit: { hours: body?.hours, minutes: body?.minutes },
    }
  }

  private getAdjustmentOptions(adjustmentReasons: AdjustmentReasonDto[], body?: AdjustHoursBody): AdjustmentOption[] {
    const adjustmentReasonCodes: Record<string, string> = {
      H: 'When the person on probation has less than an hour left',
      D: 'For example Scotland, the Channel Islands, Gibraltar or internationally',
      E: 'Add details',
    } as const

    return adjustmentReasons
      .filter(({ deliusCode }) => deliusCode in adjustmentReasonCodes)
      .map(({ name, deliusCode }) => ({
        text: name,
        value: deliusCode,
        hint: {
          html: adjustmentReasonCodes[deliusCode],
        },
        checked: body?.reasonCode === deliusCode,
      }))
  }

  updatePath(crn: string, deliusEventNumber: string, originalSearch: Record<string, string>): string {
    return pathWithQuery(
      paths.people.adjustHours.update({
        crn,
        deliusEventNumber,
      }),
      originalSearch,
    )
  }
}
