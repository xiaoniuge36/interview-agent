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
    <section className="profile-job-grid section-gap" aria-label="训练资料">
      <div id="profile" className="anchor-target">
        <ProfilePanel profile={props.profile} onChanged={props.onProfileChanged} />
      </div>
      <div id="job-intent" className="anchor-target">
        <JobIntentPanel
          profile={props.profile}
          latestJob={props.jobs[0]}
          onCreated={props.onJobCreated}
        />
      </div>
    </section>
  );
}
