import {
  recognizePlanImage,
  type PlanRecognitionParams,
  type PlanRecognitionResult,
} from './planRecognition'

type PlanRecognitionRequest = {
  imageDataUrl: string
  floorId: string
  params: PlanRecognitionParams
}

self.onmessage = async (event: MessageEvent<PlanRecognitionRequest>) => {
  try {
    const result: PlanRecognitionResult = await recognizePlanImage(
      event.data.imageDataUrl,
      event.data.floorId,
      event.data.params,
    )
    self.postMessage({ type: 'success', result })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: (error as Error).message,
    })
  }
}
