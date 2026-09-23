import { randomUUID } from 'crypto'
import { CreateAdjustmentDto } from '../../@types/shared'
import FormClient, { FormKey } from '../../data/formClient'
import BaseFormService from './baseFormService'

const ADJUSTMENT_UPDATE_FORM_TYPE = 'ADJUSTMENT_UPDATE_FORM_TYPE'

export type AdjustmentForm = Partial<CreateAdjustmentDto> & {
  originalPath?: string
}

export type CreateAppointmentForm = Omit<AdjustmentForm, 'deliusVersion'> & {
  crn: string
  deliusEventNumber: string
  originalParams: { projectCode?: string; date?: string; crn?: string; deliusEventNumber?: string }
}

export interface Form<T extends AdjustmentForm> {
  key: FormKey
  data: T
}

export default class AdjustmentFormService extends BaseFormService<AdjustmentForm> {
  constructor(formClient: FormClient) {
    super(formClient, ADJUSTMENT_UPDATE_FORM_TYPE)
  }

  async createAdjustmentForm(username: string, query: Record<string, string>): Promise<Form<AdjustmentForm>> {
    const { originalPath } = query
    const form = {
      key: this.getFormKey(randomUUID()),
      data: {
        originalPath,
        type: 'Negative' as const,
        minutes: 0,
        adjustmentReasonId: '',
        adjustmentDate: '',
        appointmentId: '',
      },
    }

    await this.saveForm(form.key.id, username, form.data)

    return form
  }
}
