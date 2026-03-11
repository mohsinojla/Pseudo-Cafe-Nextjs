"use client";

import { useSession } from "next-auth/react";

export default function Contact() {
  const { data: session } = useSession();

  return (
    <section className="px-6 py-16 max-w-6xl mx-auto text-gray-200">
      {/* Heading */}
      <h1 className="text-5xl font-bold mb-6 text-yellow-400">Contact Us</h1>
      <p className="text-lg text-gray-300 mb-12">
        Have questions, feedback, or just want to say hi? Drop us a message or visit us —
        we’d love to connect with you.
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Left: Info */}
        <div>
          <h2 className="text-3xl font-semibold mb-4">📍 Get in Touch</h2>
          <p className="mb-2">📍 <span className="text-gray-300">The Pseudo Engineers Café by 1972, Lahore, Pakistan</span></p>
          <p className="mb-2">📞 <span className="text-gray-300">+92 334 4320XXX</span></p>
          <p className="mb-6">✉️ <span className="text-gray-300">mohsinaujla@pseudocafe.com</span></p>

          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3681.5766124327424!2d88.37753427475991!3d22.669569129410345!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f89dce3e63c7f5%3A0xeba33f69e6e7c6bf!2sThe%20Pseudo%20Engineers%20Cafe%20by%201972%20Food%20Park!5e0!3m2!1sen!2s!4v1755371793791!5m2!1sen!2s"
            width="100%"
            height="280"
            allowFullScreen
            loading="lazy"
            className="rounded-xl shadow-lg"
          ></iframe>
        </div>

        {/* Right: Form */}
        <div>
          <h2 className="text-3xl font-bold mb-4">✉️ Send us a Message</h2>
          <form
            action="https://formspree.io/f/mblkelke"
            method="POST"
            className="space-y-5"
          >
            <div>
              <label className="block mb-1">Your Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Enter your name"
                defaultValue={session?.user?.name || ""}
                // readOnly={!!session?.user?.name}
                className="w-full px-4 py-2 rounded-lg 
             bg-black/10 backdrop-blur-md 
             text-white placeholder-gray-300
             shadow-lg focus:outline-none ring-1 ring-yellow-400
             focus:ring-2 focus:ring-yellow-400"

              />
            </div>

            <div>
              <label className="block mb-1">Your Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="Enter your email"
                defaultValue={session?.user?.email || ""}
                readOnly={!!session?.user?.email}
                className="w-full px-4 py-2 rounded-lg 
             bg-black/10 backdrop-blur-md 
             text-white placeholder-gray-300
             shadow-lg focus:outline-none ring-1 ring-yellow-400
             focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block mb-1">Message</label>
              <textarea
                name="message"
                required
                placeholder="Write your message..."
                rows="5"
                className="w-full px-4 py-2 rounded-lg 
             bg-black/10 backdrop-blur-md 
             text-white placeholder-gray-300
             shadow-lg focus:outline-none ring-1 ring-yellow-400
             focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <button
              type="submit"
              className="bg-yellow-400 text-black font-bold px-6 py-2 rounded-lg shadow-lg hover:bg-yellow-300 transition"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
