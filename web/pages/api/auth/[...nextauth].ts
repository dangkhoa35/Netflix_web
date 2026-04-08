import NextAuth from "next-auth";
import { authOptions } from "../../../libs/authOptions";

export default NextAuth(authOptions);
