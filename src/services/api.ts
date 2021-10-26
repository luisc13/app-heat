import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://191.253.3.195:4000'
});