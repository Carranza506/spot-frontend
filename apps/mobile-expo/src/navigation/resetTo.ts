import { router, type Href } from 'expo-router';

/** Goes to `href` and leaves it alone in the stack: the back button can't cross a login or a logout. */
export function resetTo(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
