import { MODULE_METADATA } from '@nestjs/common/constants';
import { CommonModule } from '../../common/common.module';
import { InterviewEventBus } from './realtime/interview-event.bus';
import { InterviewModule } from './interview.module';

describe('InterviewModule', () => {
  it('owns the interview-specific realtime event bus', () => {
    const interviewProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, InterviewModule);
    const commonProviders = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CommonModule);

    expect(interviewProviders).toContain(InterviewEventBus);
    expect(commonProviders).not.toContain(InterviewEventBus);
  });
});
