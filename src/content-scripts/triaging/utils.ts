const usersMap = {}

export function cacheUsernamesFromResponse(response: any) {
  for (const entry of (response.included || []).filter(entry => entry.type === 'users')) {
    usersMap[entry.id] = entry.attributes.full_name
  }
}

export function cacheUsername(userId: string, username: string) {
  usersMap[userId] = username
}

export function getUsername(userId: string) {
  return usersMap[userId]
}
