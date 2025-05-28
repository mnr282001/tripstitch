# TripStitch 🌎✈️

TripStitch is a modern, collaborative trip planning platform that helps you and your travel companions seamlessly coordinate your adventures together. Built with Next.js and Supabase, it provides an intuitive interface for planning trips, managing itineraries, and coordinating with friends and family.

## ✨ Features

- **Collaborative Calendar**: Create and share trip calendars with friends and family
- **Role-Based Access**: Invite others as editors or viewers to manage permissions
- **Multi-Day Events**: Plan activities that span multiple days
- **Real-Time Updates**: See changes as they happen with live updates
- **User Authentication**: Secure sign-up and login system
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode Support**: Automatically adapts to your system preferences

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm, yarn, or pnpm
- A Supabase account (for backend services)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tripstitch.git
cd tripstitch
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase
- **Icons**: Lucide React
- **Font**: Geist (by Vercel)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication powered by [Supabase](https://supabase.com)
- Icons from [Lucide](https://lucide.dev)
- Font by [Vercel](https://vercel.com/font)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
