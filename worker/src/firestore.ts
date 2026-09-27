import { getAccessToken, type ServiceAccount } from './token'

export interface UserProfile {
  discordId: string
  username: string
  displayName: string
  photoURL: string
}

/**
 * Upsert users/{uid} through the Firestore REST API. Profile fields are
 * refreshed on every sign-in; lastLoginAt is the server time of this one and
 * createdAt the server time of the first.
 */
export async function saveUser(account: ServiceAccount, uid: string, profile: UserProfile) {
  const database = `projects/${account.project_id}/databases/(default)`
  const fields = Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, { stringValue: v }]))
  const token = await getAccessToken(account)

  // The precondition decides createdAt: an update must find the document, a
  // create must not. Returning users are the common case, so try that first.
  const commit = (exists: boolean) =>
    fetch(`https://firestore.googleapis.com/v1/${database}/documents:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: { name: `${database}/documents/users/${uid}`, fields },
            updateMask: { fieldPaths: Object.keys(fields) },
            updateTransforms: [
              { fieldPath: 'lastLoginAt', setToServerValue: 'REQUEST_TIME' },
              ...(exists ? [] : [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }]),
            ],
            currentDocument: { exists },
          },
        ],
      }),
    })

  let res = await commit(true)
  if (res.status === 404) res = await commit(false)
  // Two first sign-ins raced and the other one created it.
  if (res.status === 409) res = await commit(true)
  if (!res.ok) throw new Error(`Firestore write failed: ${res.status} ${await res.text()}`)
}
