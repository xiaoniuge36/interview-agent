import type { RoleCategory } from './role-category';
import type { RoleGuidance } from './role-guidance';
import { businessDeliveryGuidance } from './role-guidance-business';
import { agentGuidance, dataGuidance, engineeringGuidance } from './role-guidance-technical';
import { genericGuidance, growthGuidance, productGuidance } from './role-guidance-product-growth';

export function guidanceForCategory(
  category: RoleCategory,
  context: string,
  roleTitle: string,
): RoleGuidance {
  switch (category) {
    case 'engineering':
      return engineeringGuidance(context, roleTitle);
    case 'data':
      return dataGuidance(context, roleTitle);
    case 'ai_agent':
      return agentGuidance(context, roleTitle);
    case 'product_design':
      return productGuidance(context, roleTitle);
    case 'growth_operations':
      return growthGuidance(context, roleTitle);
    case 'business_delivery':
      return businessDeliveryGuidance(context, roleTitle);
    case 'generic':
      return genericGuidance(context, roleTitle);
  }
}
