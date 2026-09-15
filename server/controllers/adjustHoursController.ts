import type { Request, RequestHandler, Response } from 'express'
import OffenderService from '../services/offenderService'
import Offender from '../models/offender'
import AdjustHoursPage from '../pages/adjustHoursPage'
import ReferenceDataService from '../services/referenceDataService'
import paths from '../paths'
import AdjustmentFormService from '../services/forms/adjustmentFormService'
import { CreateAdjustmentDto } from '../@types/shared'
import DateTimeFormats from '../utils/dateTimeUtils'
import MojDateInput from '../forms/mojDateInput'
import { pathWithQuery } from '../utils/utils'

export default class AdjustHoursController {
  constructor(
    private readonly page: AdjustHoursPage,
    private readonly offenderService: OffenderService,
    private readonly referenceDataService: ReferenceDataService,
    private readonly adjustmentFormService: AdjustmentFormService,
  ) {}

  update(): RequestHandler {
    return async (req: Request, res: Response) => {
      const { crn, deliusEventNumber } = req.params

      res.locals.audit = {
        subjectType: 'CRN',
        subjectId: crn,
      }

      const offenderSummary = await this.offenderService.getOffenderSummary({
        username: res.locals.user.username,
        crn,
      })

      const adjustmentReasons = await this.referenceDataService.getAdjustmentReasons(res.locals.user.username)
      const offender = new Offender(offenderSummary.offender)

      const form = await this.adjustmentFormService.createAdjustmentForm(
        res.locals.user.username,
        req.query as Record<string, string>,
      )

      const viewData = {
        ...this.page.viewData({
          offender,
          body: req.body,
          adjustmentReasons,
          deliusEventNumber,
        }),
        preventDoubleClick: true,
        form: form.key.id,
      }

      res.render('people/adjustHours/update', viewData)
    }
  }

  submitUpdate(): RequestHandler {
    return async (req: Request, res: Response) => {
      const { crn, deliusEventNumber } = req.params

      const formId = req.body.form
      const form = await this.adjustmentFormService.getForm(formId, res.locals.user.username)

      res.locals.audit = {
        subjectType: 'CRN',
        subjectId: crn,
      }

      const offenderSummary = await this.offenderService.getOffenderSummary({
        username: res.locals.user.username,
        crn,
      })

      const { hasErrors, errors, errorSummary } = this.page.validationErrors(req.body)

      if (hasErrors) {
        const adjustmentReasons = await this.referenceDataService.getAdjustmentReasons(res.locals.user.username)
        const offender = new Offender(offenderSummary.offender)

        const viewData = {
          ...this.page.viewData({
            offender,
            body: req.body,
            adjustmentReasons,
            deliusEventNumber,
          }),
          errorSummary,
          errors,
          preventDoubleClick: true,
        }

        return res.render('people/adjustHours/update', viewData)
      }

      const data: CreateAdjustmentDto = {
        type: form.type,
        minutes: DateTimeFormats.hoursAndMinutesToMinutes(req.body.hours, req.body.minutes),
        adjustmentReasonId: req.body.reasonCode,
        adjustmentDate: MojDateInput.toIsoDate(req.body.date),
      }

      await this.adjustmentFormService.saveForm(formId, res.locals.user.username, { ...data, form })

      return res.redirect(pathWithQuery(paths.people.adjustHours.confirm({ crn, deliusEventNumber }), { form: formId }))
    }
  }
}
