import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '../../data/users.json')

function read() {
  try {
    if (!fs.existsSync(DB_PATH)) return []
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  } catch { return [] }
}

function write(users) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2))
}

export function findUserByEmail(email) {
  return read().find(u => u.email === email.toLowerCase()) || null
}

export function findUserById(id) {
  return read().find(u => u.id === id) || null
}

export function createUser({ id, name, email, passwordHash }) {
  const users = read()
  const trialEnd = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  users.push({ id, name, email: email.toLowerCase(), passwordHash, premium: true, trialEnd, createdAt: new Date().toISOString() })
  write(users)
}

export function setPremium(email, value) {
  const users = read()
  const user = users.find(u => u.email === email.toLowerCase())
  if (user) {
    user.premium = value
    if (value) {
      user.premiumSince = user.premiumSince || new Date().toISOString()
      delete user.trialEnd
    } else {
      user.premiumSince = undefined
    }
    write(users)
  }
}

export function checkTrial(email) {
  const users = read()
  const user = users.find(u => u.email === email.toLowerCase())
  if (!user || !user.trialEnd) return
  if (user.premiumSince) return // paid premium, ignore trial
  const expired = new Date(user.trialEnd) < new Date()
  if (expired) {
    user.premium = false
    delete user.trialEnd
    write(users)
  }
}

export function setStripeCustomerId(email, customerId) {
  const users = read()
  const user = users.find(u => u.email === email.toLowerCase())
  if (user) {
    user.stripeCustomerId = customerId
    write(users)
  }
}

export function setMpId(email, mpId) {
  const users = read()
  const user = users.find(u => u.email === email.toLowerCase())
  if (user) {
    user.mpId = mpId
    write(users)
  }
}

export function getAllUsers() {
  return read()
}

export function setUserData(email, data) {
  const users = read()
  const user = users.find(u => u.email === email.toLowerCase())
  if (user) {
    user.songs = data.songs
    user.setlists = data.setlists
    write(users)
    return true
  }
  return false
}

export function getUserData(email) {
  const user = findUserByEmail(email)
  return user ? { songs: user.songs || [], setlists: user.setlists || [] } : null
}
