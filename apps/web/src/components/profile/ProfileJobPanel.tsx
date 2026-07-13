import type { JobIntentPayload, ProfilePayload } from '@interview-agent/contracts';
import { JobIntentPanel } from './JobIntentPanel';
import { ProfilePanel } from './ProfilePanel';

type ProfileJobPanelProps = {
  profile: ProfilePayload;
  jobs: JobIntentPayload[];
  onProfileChanged: (payload: ProfilePayload) => void;
  onJobCreated: (payload: JobIntentPayload) => void;
};

export function ProfileJobPanel(props: ProfileJobPanelProps) {
  return (
    <section id="profile" className="grid-2 section-gap">
      <ProfilePanel profile={props.profile} onChanged={props.onProfileChanged} />
      <JobIntentPanel
        profile={props.profile}
        latestJob={props.jobs[0]}
        onCreated={props.onJobCreated}
      />
    </section>
  );
}
